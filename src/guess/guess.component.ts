import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { trigger, animate, state, style, transition } from '@angular/animations';

import { TranslateService } from '@ngx-translate/core';

import { pipe, Observable, throwError, of } from 'rxjs';
import { switchMap, catchError, map, tap, filter } from 'rxjs/operators';

import {
  SettingsService,
  DateFormatService,
  GameService,
  Game,
  SearchOptions,
  SearchResult,
  LoadingIndicatorService,
  observeLoading,
  startLoading,
  finishLoading
} from '../shared';

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
    private loadingIndicatorService: LoadingIndicatorService,
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

  public startGame() {
    this.gameService.startGame('guess', this.searchOptions).pipe(
      observeLoading(),
      tap((game) => this.game = game)
    ).subscribe();
  }

  public pauseGame() {
    this.gameService.pauseGame(this.game).pipe(observeLoading()).subscribe();
  }

  public resumeGame() {
    this.gameService.resumeGame(this.game).pipe(observeLoading()).subscribe();
  }

  public onKeyDown($event: KeyboardEvent) {
    if (this.game && ['started', 'paused'].indexOf(this.game.gameState.state) !== -1 && $event.which === 27) {
      this.stopGame();
      return;
    }

    if (!this.game || this.game.gameState.state !== 'started') {
      return;
    }

    if ($event.which === 37 || $event.which === 36) {
      // left, home
      this.solveWrong();
    }

    if ($event.which === 38 || $event.which === 33) {
      // up, page up
      this.uncoverWord();
    }

    if ($event.which === 39 || $event.which === 35) {
      // right, end
      this.solveCorrect();
    }

    if ($event.which === 40 || $event.which === 34) {
      // down, page down
      this.coverWord();
    }
  }

  public coverWord() {
    this.gameService.coverWord(this.game).pipe(observeLoading()).subscribe();
  }

  public uncoverWord() {
    this.gameService.uncoverWord(this.game).pipe(observeLoading()).subscribe();
  }

  public solveCorrect() {
    this.gameService.solveWordCorrect(this.game).pipe(observeLoading()).subscribe();
  }

  public solveWrong() {
    this.gameService.solveWordWrong(this.game).pipe(observeLoading()).subscribe();
  }

  public guessedAnimationStarted(): void {
    if (['correct', 'wrong'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.pauseGame(this.game).pipe(observeLoading()).subscribe();
    }
  }

  public guessedAnimationDone() {
    if (['correct', 'wrong'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.resumeGame(this.game).pipe(
        startLoading(),
        switchMap((game) => this.gameService.nextWord(game)),
        finishLoading()
      ).subscribe();
    }
  }

  public stopGame() {
    this.gameService.stopGame(this.game, 'stopped').pipe(observeLoading()).subscribe();
  }

  public formatMinutes(minutes: number): string {
    return this.dateFormatService.formatMinutes(minutes);
  }

  public formatMillis(millis: number): string {
    return this.dateFormatService.formatMillis(millis);
  }
}
