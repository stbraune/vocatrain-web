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
  selector: 'watch',
  templateUrl: './watch.component.html',
  styleUrls: ['./watch.component.scss'],
  animations: [
    trigger('watched-left', [
      state('covered', style({
        backgroundColor: '#424242'
      })),
      state('uncovered', style({
        backgroundColor: '#424242'
      })),
      state('solved', style({
        backgroundColor: '#9E9E9E'
      })),
      transition('* => solved', animate('0.6s ease-out')),
      transition('solved => *', animate('0.3s 0.2s ease-out'))
    ]),
    trigger('watched-right', [
      state('covered', style({
        backgroundColor: '#424242'
      })),
      state('uncovered', style({
        backgroundColor: '#424242'
      })),
      state('solved', style({
        backgroundColor: '#9E9E9E'
      })),
      transition('* => solved', animate('0.6s ease-out')),
      transition('solved => *', animate('0.3s 0.2s ease-out'))
    ])
  ]
})
export class WatchComponent implements OnInit {
  public timeout = 2500;
  public supportedLanguages: string[] = [];
  public lefthandMode = false;

  public searchOptions: SearchOptions = {
    mode: 'by-amount',
    minutes: 5,
    amount: 150,
    searchLanguagesDirection: 'both',
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100
  };

  public game: Game;
  public interval;

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
      this.lefthandMode = appSettings.lefthandMode;
    });

    this.gameService.getMinimumLevel('watch').subscribe((minLevel) => {
      this.searchOptions.searchLevelMinimum = minLevel;
    });

    this.gameService.getMaximumLevel('watch').subscribe((maxLevel) => {
      this.searchOptions.searchLevelMaximum = maxLevel;
    });

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.onKeyDown(event);
    }, false);
  }

  public startGame() {
    this.gameService.startGame('watch', this.searchOptions).pipe(
      startLoading(),
      switchMap((game) => this.gameService.uncoverWord(game)),
      tap((game) => this.game = game),
      tap((game) => this.startInterval()),
      tap((game) => game.gameStateChanged.subscribe((event) => event.current.state === 'stopped' && this.stopInterval())),
      finishLoading()
    ).subscribe();
  }

  private startInterval() {
    if (!this.interval) {
      this.interval = setInterval(this.intervalFunction(), this.timeout);
    }
  }

  private stopInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private intervalFunction() {
    return () => {
      this.solveCorrect();
    };
  }

  public pauseGame() {
    this.gameService.pauseGame(this.game).pipe(
      observeLoading(),
      tap((game) => this.stopInterval())
    ).subscribe();
  }

  public resumeGame() {
    this.gameService.resumeGame(this.game).pipe(
      observeLoading(),
      tap((game) => this.startInterval())
    ).subscribe();
  }

  public onKeyDown($event: KeyboardEvent) {
    if (this.game && ['started', 'paused'].indexOf(this.game.gameState.state) !== -1 && $event.which === 27) {
      this.stopGame();
      return;
    }

    this.solveCorrect();
  }

  public coverWord() {
    this.gameService.coverWord(this.game).pipe(observeLoading()).subscribe();
  }

  public uncoverWord() {
    this.gameService.uncoverWord(this.game).pipe(observeLoading()).subscribe();
  }

  public solveCorrect() {
    this.gameService.solveWordCorrect(this.game).pipe(observeLoading()).subscribe();
    this.stopInterval();
    this.startInterval();
  }

  public solveWrong() {
    this.gameService.solveWordWrong(this.game).pipe(observeLoading()).subscribe();
  }

  public animationStarted(): void {
    if (['correct'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.pauseGame(this.game).pipe(observeLoading()).subscribe();
    }
  }

  public animationDone() {
    if (['correct'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.resumeGame(this.game).pipe(
        startLoading(),
        switchMap((game) => this.gameService.nextWord(game)),
        switchMap((searchResult) => this.gameService.uncoverWord(this.game)),
        finishLoading()
      ).subscribe();
    }
  }

  public stopGame() {
    this.gameService.stopGame(this.game, 'stopped').pipe(
      observeLoading(),
      tap((game) => this.stopInterval())
    ).subscribe();
  }

  public formatMinutes(minutes: number): string {
    return this.dateFormatService.formatMinutes(minutes);
  }

  public formatMillis(millis: number): string {
    return this.dateFormatService.formatMillis(millis);
  }
}
