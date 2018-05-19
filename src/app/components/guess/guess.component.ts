import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { pipe, Observable, throwError, of } from 'rxjs';
import { switchMap, catchError, map, tap } from 'rxjs/operators';

import { WordEntityService } from '../../services';
import { GuessService } from './guess.service';

import { SearchOptions } from './search-options';
import { SearchResult } from './search-result';
import { SettingsService } from '../../settings';
import { GameLogEntityService, GameLogEntity } from '../../../shared';

@Component({
  selector: 'guess',
  templateUrl: './guess.component.html',
  styleUrls: ['./guess.component.scss']
})
export class GuessComponent implements OnInit {
  public supportedLanguages: string[] = [];

  public searchOptions: SearchOptions = {
    mode: 'by-time',
    minutes: 15,
    amount: 75,
    searchLanguagesDirection: 'both',
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100
  };

  public started = false;
  public startedAt: Date;
  public currentWord: SearchResult;
  public currentWordState = -1;
  public duration = '0:00';
  public durationInterval;
  public totalWords = 0;
  public finished = false;
  public finishReason: 'no-more-words' | 'reached-amount' | 'reached-minutes';

  public constructor(
    private settingsService: SettingsService,
    private wordEntityService: WordEntityService,
    private guessService: GuessService,
    private gameLogEntityService: GameLogEntityService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit(): void {
    this.settingsService.appSettingsChanged.subscribe((appSettings) => {
      this.supportedLanguages = appSettings.userLanguages.filter((userLanguage) => userLanguage.enabled)
        .map((userLanguage) => userLanguage.iso);
      this.searchOptions.sourceLanguage = this.supportedLanguages.length > 0 && this.supportedLanguages[0];
      this.searchOptions.targetLanguage = this.supportedLanguages.length > 1 && this.supportedLanguages[1];
      this.searchOptions.searchLanguages = [
        this.supportedLanguages.length > 0 && this.supportedLanguages[0],
        this.supportedLanguages.length > 1 && this.supportedLanguages[1]
      ];
    });

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.onKeyDown(event);
    }, false);
  }

  public onStartGuessing() {
    this.startGuessing().subscribe();
  }

  public startGuessing(): Observable<SearchResult> {
    this.finished = false;
    this.started = true;
    this.startedAt = new Date();
    this.duration = '0:00';
    this.totalWords = 0;

    return this.gameLogEntityService.startGameLog('guess').pipe(
      tap((gameLogEntity) => {
        if (this.durationInterval) {
          clearInterval(this.durationInterval);
        }

        this.durationInterval = setInterval(() => {
          this.duration = this.getDuration();

          if (this.searchOptions.mode === 'by-time') {
            const millis = new Date().getTime() - this.startedAt.getTime();
            const minutes = millis / 1000 / 60;
            if (minutes >= this.searchOptions.minutes) {
              this.finishGuessing('reached-minutes').subscribe();
            }
          }
        }, 1000);
      }),
      switchMap((gameLogEntity) => this.nextWord())
    );
  }

  public getDuration() {
    return this.formatDuration(this.startedAt, new Date());
  }

  public formatDuration(start: Date, end: Date): string {
    return this.formatSeconds(((+end) - (+start)) / 1000);
  }

  public formatMinutes(minutes: number): string {
    return this.formatSeconds(minutes * 60);
  }

  public formatSeconds(seconds: number): string {
    const h = this.parseInt(seconds / 3600);
    const m = this.parseInt((seconds % 3600) / 60);
    const s = this.parseInt(seconds % 60);

    const hs = h > 9 ? h : '0' + h;
    const ms = m > 9 ? m : '0' + m;
    const ss = s > 9 ? s : '0' + s;

    if (h === 0) {
      return ms + ':' + ss;
    }

    return hs + ':' + ms + ':' + ss;
  }

  private parseInt(n: any): number {
    return parseInt(<string>n, 10);
  }

  public onStopGuessing() {
    this.stopGuessing().subscribe();
  }

  public stopGuessing(): Observable<GameLogEntity> {
    if (!this.started) {
      return;
    }

    this.started = false;
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    return this.gameLogEntityService.finishGameLog();
  }

  public finishGuessing(reason: 'no-more-words' | 'reached-amount' | 'reached-minutes'): Observable<GameLogEntity> {
    this.finished = true;
    this.finishReason = reason;
    return this.stopGuessing();
  }

  public onKeyDown($event: KeyboardEvent) {
    if (!this.started) {
      return;
    }

    const target = <HTMLInputElement>$event.target;
    if ($event.which === 37 || $event.which === 36) {
      // left, home
      this.guessedWrong().subscribe();
      $event.preventDefault();
    }

    if ($event.which === 38 || $event.which === 33) {
      // up, page up
      this.showTranslation();
      $event.preventDefault();
    }

    if ($event.which === 39 || $event.which === 35) {
      // right, end
      this.guessedRight().subscribe();
      $event.preventDefault();
    }

    if ($event.which === 40 || $event.which === 34) {
      // down, page down
      this.hideTranslation();
      $event.preventDefault();
    }
  }

  public hideTranslation() {
    if (this.currentWordState === 1) {
      this.currentWordState = 0;
      console.log('Hiding translation');
    }
  }

  public showTranslation() {
    if (this.currentWordState === 0) {
      this.currentWordState = 1;
      console.log('Showing translation');
    }
  }

  public guessedRight(): Observable<SearchResult> {
    if (this.currentWordState !== 1) {
      return;
    }

    console.log('Guessed it right!');
    return this.guessService.guessRight(this.currentWord)
      .pipe(
        switchMap((wordEntity) => this.gameLogEntityService.incrementCorrect()),
        switchMap((gameLogEntity) => this.guessedWord()),
        switchMap((gameLogEntity) => this.nextWord())
      );
  }

  public guessedWrong(): Observable<SearchResult> {
    if (this.currentWordState !== 1) {
      return;
    }

    console.log('Guessed it wrong!');
    return this.guessService.guessWrong(this.currentWord)
      .pipe(
        switchMap((wordEntity) => this.gameLogEntityService.incrementWrong()),
        switchMap((gameLogEntity) => this.guessedWord()),
        switchMap((gameLogEntity) => this.nextWord())
      );
  }

  private guessedWord(): Observable<GameLogEntity> {
    this.currentWordState = 2;
    this.totalWords++;

    switch (this.searchOptions.mode) {
      case 'by-amount':
        if (this.totalWords === this.searchOptions.amount) {
          return this.finishGuessing('reached-amount');
        }
        return this.gameLogEntityService.getCurrentGameLog();
      case 'by-time':
        return this.gameLogEntityService.getCurrentGameLog();
      default:
        return throwError(`Unsupported mode: ${this.searchOptions.mode}`);
    }
  }

  public nextWord(): Observable<SearchResult> {
    this.currentWordState = -1;
    this.currentWord = undefined;
    return this.guessService.findGuessWords(Object.assign({}, this.searchOptions, { limit: 1 }))
      .pipe(
        switchMap((searchResults) => {
          if (searchResults.length === 0) {
            return this.finishGuessing('no-more-words').pipe(
              map((gameLogEntity) => null)
            );
          }

          this.currentWordState = 0;
          this.currentWord = searchResults[0];
          this.currentWord.key.answerAt = new Date(this.currentWord.key.answerAt);
          return of(this.currentWord);
        }),
        catchError((error) => this.finishGuessing('no-more-words').pipe(
          map((gameLogEntity) => null)
        )),
    );
  }
}
