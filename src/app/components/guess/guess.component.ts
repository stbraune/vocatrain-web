import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { trigger, animate, state, style, transition } from '@angular/animations';

import { TranslateService } from '@ngx-translate/core';

import { pipe, Observable, throwError, of } from 'rxjs';
import { switchMap, catchError, map, tap, filter } from 'rxjs/operators';

import { SettingsService } from '../../../settings';
import { GameService, Game, SearchOptions, SearchResult } from '../../../shared/game';
import { DateFormatService } from '../../../shared';

@Component({
  selector: 'guess',
  templateUrl: './guess.component.html',
  styleUrls: ['./guess.component.scss'],
  animations: [
    trigger('guessed', [
      state('covered', style({
        backgroundColor: '#424242'
      })),
      state('correct', style({
        backgroundColor: '#558B2F'
      })),
      state('wrong', style({
        backgroundColor: '#D84315'
      })),
      transition('* => correct', animate('1.5s ease-out')),
      transition('* => wrong', animate('1.5s ease-out')),
      transition('correct => *', animate('0.5s 0.2s ease-out')),
      transition('wrong => *', animate('0.5s 0.2s ease-out'))
    ])
  ]
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

  public game: Game;

  public constructor(
    private settingsService: SettingsService,
    private gameService: GameService,
    private dateFormatService: DateFormatService,
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

    this.gameService.getMinimumLevel('guess').subscribe((minLevel) => {
      this.searchOptions.searchLevelMinimum = minLevel;
    });

    this.gameService.getMaximumLevel('guess').subscribe((maxLevel) => {
      this.searchOptions.searchLevelMaximum = maxLevel;
    });

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.onKeyDown(event);
    }, false);
  }

  public startGuessing() {
    this.gameService.startGame('guess', this.searchOptions).pipe(
      tap((game) => this.game = game)
    ).subscribe();
  }

  public pauseGame() {
    this.gameService.pauseGame(this.game).subscribe();
  }

  public resumeGame() {
    this.gameService.resumeGame(this.game).subscribe();
  }

  public onKeyDown($event: KeyboardEvent) {
    if (!this.game || this.game.gameState.state !== 'started') {
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
    this.gameService.coverWord(this.game).subscribe();
  }

  public showTranslation() {
    this.gameService.uncoverWord(this.game).subscribe();
  }

  public guessedRight(): Observable<Game> {
    return this.gameService.solveWordCorrect(this.game);
  }

  public guessedWrong(): Observable<Game> {
    return this.gameService.solveWordWrong(this.game);
  }

  public guessedAnimationStarted(): void {
    if (['correct', 'wrong'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.pauseGame(this.game).subscribe();
    }
  }

  public guessedAnimationDone() {
    if (['correct', 'wrong'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.resumeGame(this.game).pipe(
        switchMap((game) => this.gameService.nextWord(game))
      ).subscribe();
    }
  }

  public stopGuessing() {
    this.gameService.stopGame(this.game, 'stopped').subscribe();
  }

  public formatMinutes(minutes: number): string {
    return this.dateFormatService.formatMinutes(minutes);
  }

  public formatMillis(millis: number): string {
    return this.dateFormatService.formatMillis(millis);
  }
}
