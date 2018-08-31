import { Component, OnInit, ViewChild, ElementRef, QueryList, AfterViewInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { trigger, animate, state, style, transition } from '@angular/animations';

import { TranslateService } from '@ngx-translate/core';

import { pipe, Observable, throwError, of } from 'rxjs';
import { switchMap, catchError, map, tap, filter } from 'rxjs/operators';

import {
  SettingsService,
  DateFormatService,
  DialogTextGameService,
  DialogTextGame,
  DialogTextSearchOptions,
  SearchResult,
  LoadingIndicatorService,
  observeLoading,
  startLoading,
  finishLoading,
  WordEntity,
  WordEntityService,
  Text
} from '../shared';

import * as XRegExp from 'xregexp/xregexp-all';
import { ViewChildren } from '@angular/core';

@Component({
  selector: 'dialog-texts',
  templateUrl: './dialog-texts.component.html',
  styleUrls: ['./dialog-texts.component.scss'],
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
      transition('* => correct', animate('0.6s ease-out')),
      transition('* => partially-correct', animate('0.6s ease-out')),
      transition('* => wrong', animate('0.6s ease-out')),
      transition('* => totally-wrong', animate('0.6s ease-out')),
      transition('correct => *', animate('0.3s 0.2s ease-out')),
      transition('partially-correct => *', animate('0.3s 0.2s ease-out')),
      transition('wrong => *', animate('0.3s 0.2s ease-out')),
      transition('totally-wrong => *', animate('0.3s 0.2s ease-out'))
    ])
  ]
})
export class DialogTextsComponent implements OnInit {
  public supportedLanguages: string[] = [];

  public mode: string;
  public searchOptions: DialogTextSearchOptions = {
    searchLanguagesDirection: 'tts',
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100
  };

  public game: DialogTextGame;

  public answers: string[] = [];
  public answerStates: Array<'undefined' | 'correct' | 'partially-correct' | 'wrong'> = [];
  public uncoveredCurrentWord = false;

  @ViewChildren('answerInputFormField')
  public answerInputElements: QueryList<ElementRef>;

  public constructor(
    private loadingIndicatorService: LoadingIndicatorService,
    private settingsService: SettingsService,
    private dialogTextGameService: DialogTextGameService,
    private dateFormatService: DateFormatService,
    private wordEntityService: WordEntityService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit(): void {
    setTimeout(() => {
      this.mode = 'dialog-text-type-free';
      this.modeChanged();
    });
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

    // setTimeout(() => {
    //   // for testing purposes
    //   this.startGame();
    // }, 2000);
  }

  // public ngAfterViewInit() {
  //   console.log('ql', this.answerInputElements);
  //   this.answerInputElements.changes.subscribe((x) => {
  //     console.log('x', x);

  //     // this.answerInputElements.filter((elementRef) => parseInt(elementRef.nativeElement.dataset['answerIndex'], 10) > 42);
  //     // this.answerInputElements.forEach((el: ElementRef) => {
  //     //   console.log('el', el);
  //     //   el.nativeElement.dataset['answerIndex'];
  //     // });
  //   });
  // }

  public modeChanged() {
    this.dialogTextGameService.getMinimumLevel(this.mode).subscribe((minLevel) => {
      this.searchOptions.searchLevelMinimum = minLevel;
    });

    this.dialogTextGameService.getMaximumLevel(this.mode).subscribe((maxLevel) => {
      this.searchOptions.searchLevelMaximum = maxLevel;
    });
  }

  public containsTag(tags: string[], tag: string) {
    return tags.indexOf(tag) !== -1;
  }

  public startGame() {
    this.dialogTextGameService.startGame(this.mode, this.searchOptions).pipe(
      observeLoading(),
      tap((game) => this.game = game),
      tap((game) => console.log(game)),
      tap((game) => {
        this.answers = game.word && game.word.key.answers.map((answer) => '') || [];
        this.answerStates = game.word && game.word.key.answers.map((answer) => 'undefined' as 'undefined') || [];
      })
    ).subscribe();
  }

  public pauseGame() {
    this.dialogTextGameService.pauseGame(this.game).pipe(observeLoading()).subscribe();
  }

  public resumeGame() {
    this.dialogTextGameService.resumeGame(this.game).pipe(observeLoading()).subscribe();
  }

  public onKeyPress($event: KeyboardEvent, answerIndex: number) {
    if (!this.game || this.game.gameState.state !== 'started') {
      return;
    }

    if ($event.which === 13) {
      // enter
      this.testAnswer(answerIndex);
    }
  }

  public testAnswer(answerIndex: number) {
    if (this.answerStates[answerIndex] === 'correct') {
      return;
    }

    const actualAnswer = this.answers[answerIndex];
    const expectedAnswer = this.game.word.key.answers[answerIndex];
    const rate = this.calculateRate(actualAnswer, expectedAnswer);
    if (rate === 1) {
      // totally correct
      this.uncoverWord(answerIndex);
      this.solveCorrect(answerIndex);
    } else if (rate >= 0.75) {
      // partially correct
      this.uncoverWord(answerIndex);
      this.solvePartiallyCorrect(answerIndex);
    } else {
      // totally wrong
      this.uncoverWord(answerIndex);
      this.solveWrong(answerIndex);
    }
  }

  private calculateRate(actualAnswer: string, expectedAnswer: string) {
    const sanit1 = this.sanitizeWord(actualAnswer);
    const sanit2 = this.sanitizeWord(expectedAnswer);
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

  public onKeyDown($event: KeyboardEvent, answerIndex: number) {
    if (this.game && ['started', 'paused'].indexOf(this.game.gameState.state) !== -1 && $event.which === 27) {
      this.stopGame();
      return;
    }

    if (!this.game || this.game.gameState.state !== 'started') {
      return;
    }

    if (this.answerStates[answerIndex] === 'partially-correct') {
      if ($event.which === 37 || $event.which === 36) {
        // left, home
        this.solveWrong(answerIndex);
      }

      if ($event.which === 39 || $event.which === 35) {
        // right, end
        this.solveCorrect(answerIndex);
      }

      $event.preventDefault();
      return;
    }

    if ($event.which === 38 || $event.which === 33) {
      // up, page up
      this.uncoverWord(answerIndex);
    }

    if ($event.which === 40 || $event.which === 34) {
      // down, page down
      this.coverWord(answerIndex);
    }
  }

  public coverWord(answerIndex: number) {
    this.dialogTextGameService.coverWord(this.game, answerIndex).pipe(observeLoading()).subscribe();
  }

  public uncoverWord(answerIndex: number) {
    this.uncoveredCurrentWord = true;
    this.dialogTextGameService.uncoverWord(this.game, answerIndex).pipe(observeLoading()).subscribe();
  }

  public solveCorrect(answerIndex: number) {
    if (this.uncoveredCurrentWord) {
      this.dialogTextGameService.solveWordCorrect(this.game, answerIndex, this.answers[answerIndex]).pipe(
        observeLoading(),
        tap((game) => this.answerStates[answerIndex] = 'correct'),
        tap(() => {
          const nextAnswerInputElement = this.answerInputElements
            .filter((elementRef) => parseInt(elementRef.nativeElement.dataset['answerIndex'], 10) > answerIndex)[0];
          if (nextAnswerInputElement) {
            nextAnswerInputElement.nativeElement.focus();
          }
        })
      ).subscribe();
    } else {
      this.dialogTextGameService.solveWordCorrect(this.game, answerIndex, this.answers[answerIndex]).pipe(
        observeLoading(),
        tap((game) => this.answerStates[answerIndex] = 'partially-correct')
      ).subscribe();
    }
  }

  public solvePartiallyCorrect(answerIndex: number) {
    this.answerStates[answerIndex] = 'partially-correct';
  }

  public solveWrong(answerIndex: number) {
    this.dialogTextGameService.solveWordWrong(this.game, answerIndex, this.answers[answerIndex]).pipe(
      tap((x) => console.log('solved wrong', answerIndex, this.answers[answerIndex])),
      observeLoading(),
      tap((game) => this.answerStates[answerIndex] = 'wrong'),
      tap(() => {
        const nextAnswerInputElement = this.answerInputElements
          .filter((elementRef) => parseInt(elementRef.nativeElement.dataset['answerIndex'], 10) > answerIndex)[0];
        if (nextAnswerInputElement) {
          nextAnswerInputElement.nativeElement.focus();
        }
      })
    ).subscribe();
  }

  public stopGame() {
    this.dialogTextGameService.stopGame(this.game, 'stopped').pipe(observeLoading()).subscribe();
  }

  public formatMinutes(minutes: number): string {
    return this.dateFormatService.formatMinutes(minutes);
  }

  public formatMillis(millis: number): string {
    return this.dateFormatService.formatMillis(millis);
  }
}
