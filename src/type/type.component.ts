import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { trigger, animate, state, style, transition } from '@angular/animations';

import { TranslateService } from '@ngx-translate/core';

import { pipe, Observable, throwError, of } from 'rxjs';
import { switchMap, catchError, map, tap, filter } from 'rxjs/operators';

import { SettingsService } from '../settings';
import { DateFormatService, GameService, Game, SearchOptions, SearchResult } from '../shared';

import * as XRegExp from 'xregexp/xregexp-all';

@Component({
  selector: 'type',
  templateUrl: './type.component.html',
  styleUrls: ['./type.component.scss'],
  animations: [
    trigger('typed', [
      state('undefined', style({
        backgroundColor: '#424242'
      })),
      state('correct', style({
        backgroundColor: '#558B2F'
      })),
      state('partially-correct', style({
        backgroundColor: '#FFB300'
      })),
      state('wrong', style({
        backgroundColor: '#D84315'
      })),
      state('totally-wrong', style({
        backgroundColor: '#D84315'
      })),
      transition('* => correct', animate('1.5s ease-out')),
      transition('* => partially-correct', animate('1.5s ease-out')),
      transition('* => wrong', animate('1.5s ease-out')),
      transition('* => totally-wrong', animate('1.5s ease-out')),
      transition('correct => *', animate('0.5s 0.2s ease-out')),
      transition('partially-correct => *', animate('0.5s 0.2s ease-out')),
      transition('wrong => *', animate('0.5s 0.2s ease-out')),
      transition('totally-wrong => *', animate('0.5s 0.2s ease-out'))
    ])
  ]
})
export class TypeComponent implements OnInit {
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

  public answer = '';
  public answerState: 'undefined' | 'correct' | 'partially-correct' | 'wrong' | 'totally-wrong';

  public _answerInputElement: ElementRef;

  @ViewChild('answerInput')
  public set answerInputElement(value: ElementRef) {
    this._answerInputElement = value;
    if (this._answerInputElement) {
      setTimeout(() => this.focusAnswerInput(), 0);
    }
  }

  public get answerInputElement() {
    return this._answerInputElement;
  }

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

    this.gameService.getMinimumLevel('type').subscribe((minLevel) => {
      this.searchOptions.searchLevelMinimum = minLevel;
    });

    this.gameService.getMaximumLevel('type').subscribe((maxLevel) => {
      this.searchOptions.searchLevelMaximum = maxLevel;
    });

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.onKeyDown(event);
    }, false);
  }

  public startGame() {
    this.gameService.startGame('type', this.searchOptions).pipe(
      tap((game) => this.game = game),
      tap((game) => this.focusAnswerInput())
    ).subscribe();
  }

  public pauseGame() {
    this.gameService.pauseGame(this.game).subscribe();
  }

  public resumeGame() {
    this.gameService.resumeGame(this.game).subscribe();
  }

  public onKeyPress($event: KeyboardEvent) {
    if (!this.game || this.game.gameState.state !== 'started') {
      return;
    }

    if (this.answerState === 'totally-wrong') {
      return this.solveWrong();
    }

    if ($event.which === 13) {
      // enter
      if (this.answerState !== 'correct') {
        return this.testAnswer();
      }
    }
  }

  public testAnswer() {
    const rate = this.calculateRate();
    if (rate === 1) {
      // totally correct
      this.uncoverWord();
      this.solveCorrect();
    } else if (rate >= 0.75) {
      // partially correct
      this.uncoverWord();
      this.solvePartiallyCorrect();
    } else {
      // totally wrong
      this.uncoverWord();
      this.solveTotallyWrong();
    }
  }

  private calculateRate() {
    const sanit1 = this.sanitizeWord(this.answer);
    const sanit2 = this.sanitizeWord(this.game.word.key.answer);
    const distance = this.levenshteinDistance(sanit1, sanit2);
    const length = sanit2.length;
    const rate = (length - distance) / length;
    return rate;
  }

  private sanitizeWord(word: string) {
    const regexp = XRegExp(`[^\\pL]`, 'g');
    return XRegExp.replace(word.toLowerCase(), regexp, '', 'all');
  }

  // https://gist.github.com/andrei-m/982927
  private levenshteinDistance(a: string, b: string) {
    if (a.length === 0) {
      return b.length;
    }

    if (b.length === 0) {
      return a.length;
    }

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
            Math.min(matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1)); // deletion
        }
      }
    }

    return matrix[b.length][a.length];
  }

  public nextWord() {
    return this.gameService.nextWord(this.game).pipe(
      tap((searchResult) => this.answerState = 'undefined')
    );
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
      if (this.answerState === 'partially-correct') {
        this.solveWrong();
      }
    }

    if ($event.which === 39 || $event.which === 35) {
      // right, end
      if (this.answerState === 'partially-correct') {
        this.solveCorrect();
      }
    }

    if ($event.which === 38 || $event.which === 33) {
      // up, page up
      this.uncoverWord();
    }

    if ($event.which === 40 || $event.which === 34) {
      // down, page down
      this.coverWord();
    }
  }

  public coverWord() {
    this.gameService.coverWord(this.game).subscribe();
  }

  public uncoverWord() {
    this.gameService.uncoverWord(this.game).subscribe();
  }

  public solveCorrect() {
    this.gameService.solveWordCorrect(this.game).pipe(
      tap((game) => this.answerState = 'correct')
    ).subscribe();
  }

  public solvePartiallyCorrect() {
    this.answerState = 'partially-correct';
  }

  public solveWrong() {
    this.gameService.solveWordWrong(this.game).pipe(
      tap((game) => this.answerState = 'wrong')
    ).subscribe();
  }

  public solveTotallyWrong() {
    this.answerState = 'totally-wrong';
  }

  public typedAnimationStarted(): void {
    if (['correct', 'wrong'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.pauseGame(this.game).subscribe();
    }
  }

  public typedAnimationDone() {
    if (['correct', 'wrong'].indexOf(this.game.wordState.reason) !== -1) {
      this.gameService.resumeGame(this.game).pipe(
        switchMap((game) => this.gameService.nextWord(game)),
        tap((searchResult) => this.answerState = 'undefined'),
        tap((searchResult) => this.answer = ''),
        tap((searchResult) => this.focusAnswerInput())
      ).subscribe();
    }
  }

  public focusAnswerInput() {
    if (this.answerInputElement) {
      this.answerInputElement.nativeElement.focus();
    }
  }

  public stopGame() {
    this.gameService.stopGame(this.game, 'stopped').subscribe();
  }

  public formatMinutes(minutes: number): string {
    return this.dateFormatService.formatMinutes(minutes);
  }

  public formatMillis(millis: number): string {
    return this.dateFormatService.formatMillis(millis);
  }
}
