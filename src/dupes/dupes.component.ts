import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { trigger, animate, state, style, transition } from '@angular/animations';

import { TranslateService } from '@ngx-translate/core';

import { pipe, Observable, throwError, of, Subject, Subscription } from 'rxjs';
import { switchMap, catchError, map, tap, filter, debounceTime } from 'rxjs/operators';

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
  finishLoading,
  WordEntityService,
  WordEntity,
  WordTypeEntityService,
  WordTypeEntity
} from '../shared';

import * as XRegExp from 'xregexp/xregexp-all';

@Component({
  selector: 'dupes',
  templateUrl: './dupes.component.html',
  styleUrls: ['./dupes.component.scss']
})
export class DupesComponent implements OnInit {
  public supportedLanguages: string[] = [];
  public lefthandMode = false;

  public searchOptions: SearchOptions = {
    mode: 'by-time',
    minutes: 15,
    amount: 75,
    searchLanguagesDirection: 'both',
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100
  };

  public queryHelpFields: string[] = [];

  public wordTypeEntities: WordTypeEntity[] = [];

  public game: Game;
  public wordStateSubscription: Subscription;

  public questionQuerySimilarity = 0.5;
  public questionQuery = '';
  public questionQueryChanged = new Subject<string>();
  public questionSearchResults: WordEntity[] = [];

  public answerQuerySimilarity = 0.5;
  public answerQuery = '';
  public answerQueryChanged = new Subject<string>();
  public answerSearchResults: WordEntity[] = [];

  public constructor(
    private loadingIndicatorService: LoadingIndicatorService,
    private settingsService: SettingsService,
    private gameService: GameService,
    private wordEntityService: WordEntityService,
    private wordTypeEntityService: WordTypeEntityService,
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

    this.loadWordTypeEntities();
    this.loadQueryHelpFields();

    this.gameService.getMinimumLevel('dupes').subscribe((minLevel) => {
      this.searchOptions.searchLevelMinimum = minLevel;
    });

    this.gameService.getMaximumLevel('dupes').subscribe((maxLevel) => {
      this.searchOptions.searchLevelMaximum = maxLevel;
    });

    this.questionQueryChanged.pipe(
      debounceTime(300),
      switchMap((questionQuery) => this.searchWordEntities(questionQuery))
    ).subscribe((questionSearchResults) => {
      this.questionSearchResults = questionSearchResults;
    }, (error) => {
      console.error(error);
    });

    this.answerQueryChanged.pipe(
      debounceTime(300),
      switchMap((answerQuery) => this.searchWordEntities(answerQuery))
    ).subscribe((answerSearchResults) => {
      this.answerSearchResults = answerSearchResults;
    }, (error) => {
      console.error(error);
    });
  }

  public loadQueryHelpFields() {
    this.loadingIndicatorService.notifyLoading();
    this.wordEntityService.getWordEntitiesFields().subscribe((queryFields) => {
      this.loadingIndicatorService.notifyFinished();
      this.queryHelpFields.push(...queryFields);
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
    });
  }

  private loadWordTypeEntities() {
    this.loadingIndicatorService.notifyLoading();
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.loadingIndicatorService.notifyFinished();
      this.wordTypeEntities = wordTypeEntities;
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
    });
  }

  public onHelpQuery() {
    window.open('http://lucene.apache.org/core/3_6_2/queryparsersyntax.html', '_blank');
  }

  public onQuestionSimilarityChanged() {
    this.buildAndRunQuestionQuery();
  }

  private buildAndRunQuestionQuery() {
    this.questionQuery = this.buildQuery(this.game.word.key.question, this.questionQuerySimilarity);
    this.onQuestionQueryChanged();
  }

  public onClearQuestionQuery() {
    if (this.questionQuery !== '') {
      this.questionQuery = '';
      this.onQuestionQueryChanged();
    }
  }

  public onQuestionQueryChanged() {
    this.questionQueryChanged.next(this.questionQuery);
  }

  public onAnswerSimilarityChanged() {
    this.buildAndRunAnswerQuery();
  }

  private buildAndRunAnswerQuery() {
    this.answerQuery = this.buildQuery(this.game.word.key.answer, this.answerQuerySimilarity);
    this.onAnswerQueryChanged();
  }

  public onClearAnswerQuery() {
    if (this.answerQuery !== '') {
      this.answerQuery = '';
      this.onAnswerQueryChanged();
    }
  }

  public onAnswerQueryChanged() {
    this.answerQueryChanged.next(this.answerQuery);
  }

  private buildQuery(word: string, similarity: number) {
    return word.split(/\s+/g)
      .map((part) => this.sanitizeWord(part))
      .map((part) => `${part}~${similarity}`)
      .join(' ');
  }

  private sanitizeWord(word: string) {
    const regexp = XRegExp(`[^\\pL]`, 'g');
    return XRegExp.replace(word.toLowerCase(), regexp, '', 'all');
  }

  public searchWordEntities(query: string): Observable<WordEntity[]> {
    return this.wordEntityService.searchWordEntities({
      q: query,
      include_docs: true
    }).pipe(
      observeLoading(),
      map((result) => result.rows.map((row) => row.doc))
    );
  }

  public startGame() {
    if (this.wordStateSubscription) {
      this.wordStateSubscription.unsubscribe();
      this.wordStateSubscription = undefined;
    }

    this.gameService.startGame('dupes', this.searchOptions).pipe(
      observeLoading(),
      tap((game) => this.game = game),
      tap((game) => this.wordStateSubscription = this.game.wordStateChanged.subscribe((change) => {
        console.log('word state change', change);
        if (change.previous.state === 'undefined' && change.current.state === 'covered') {
          this.uncoverWord();
          this.buildAndRunQuestionQuery();
          this.buildAndRunAnswerQuery();
        }
      }))
    ).subscribe();
  }

  public pauseGame() {
    this.gameService.pauseGame(this.game).pipe(observeLoading()).subscribe();
  }

  public resumeGame() {
    this.gameService.resumeGame(this.game).pipe(observeLoading()).subscribe();
  }

  public saveWordEntity(wordEntity: WordEntity) {
    this.loadingIndicatorService.notifyLoading();
    this.wordEntityService.putWordEntity(wordEntity).subscribe((wordEntities) => {
      this.loadingIndicatorService.notifyFinished();
      this.snackBar.open('Saved!', null, {
        duration: 3000
      });
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
      this.snackBar.open('Error!', 'Ok', {
        panelClass: 'error'
      });
    });
  }

  public coverWord() {
    this.gameService.coverWord(this.game).pipe(observeLoading()).subscribe();
  }

  public uncoverWord() {
    this.gameService.uncoverWord(this.game).pipe(observeLoading()).subscribe();
  }

  public solveCorrect() {
    this.gameService.solveWordCorrect(this.game).pipe(
      startLoading(),
      switchMap((game) => this.gameService.nextWord(game)),
      finishLoading()
    ).subscribe();
  }

  public stopGame() {
    this.gameService.stopGame(this.game, 'stopped')
      .pipe(observeLoading())
      .subscribe(() => {
        this.wordStateSubscription.unsubscribe();
        this.wordStateSubscription = undefined;
      });
  }

  public formatMinutes(minutes: number): string {
    return this.dateFormatService.formatMinutes(minutes);
  }

  public formatMillis(millis: number): string {
    return this.dateFormatService.formatMillis(millis);
  }
}
