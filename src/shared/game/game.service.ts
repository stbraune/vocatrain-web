import { Injectable } from '@angular/core';

import { throwError, Observable, of, Subject, pipe } from 'rxjs';
import { map, switchMap, catchError, tap, filter } from 'rxjs/operators';

import { Database } from '../database';
import { WordEntityService, WordEntity } from '../words';
import { SearchOptions } from './search-options';
import { SearchResult, SearchResultKey } from './search-result';
import { GameLogEntityService, GameLogEntity } from '../game-log';

export type GameState =
  { state: 'undefined', reason: 'undefined' }
  | { state: 'started', reason: 'started' }
  | { state: 'paused', reason: 'paused' }
  | { state: 'stopped', reason: 'no-more-words' | 'reached-amount' | 'reached-minutes' | 'stopped' };
export type WordState = { state: 'undefined', reason: 'undefined' | 'next-word' }
  | { state: 'covered', reason: 'covered' | 'by-user' }
  | { state: 'uncovered', reason: 'uncovered' | 'by-user' }
  | { state: 'solved', reason: 'correct' | 'wrong' };

export interface Game {
  mode: string;

  searchOptions: SearchOptions;
  gameLogEntity: GameLogEntity;

  gameState: GameState;
  gameStateChanged: Subject<{ previous: GameState, current: GameState }>;

  durationReferenceDate: Date;
  duration: number;
  durationInterval: any;
  amount: number;

  word: SearchResult;
  wordState: WordState;
  wordStateChanged: Subject<{ previous: WordState, current: WordState }>;
}

@Injectable()
export class GameService {
  private db: Database<WordEntity>;

  public constructor(
    private wordEntityService: WordEntityService,
    private gameLogEntityService: GameLogEntityService
  ) {
    this.db = wordEntityService.getDatabase();
  }

  public startGame(mode: string, searchOptions: SearchOptions): Observable<Game> {
    console.log('startGame');
    const game: Game = {
      mode: mode,
      searchOptions: searchOptions,
      gameLogEntity: undefined,
      gameState: { state: 'undefined', reason: 'undefined' },
      gameStateChanged: new Subject<{ previous: GameState, current: GameState }>(),
      word: undefined,
      wordState: { state: 'undefined', reason: 'undefined' },
      wordStateChanged: new Subject<{ previous: WordState, current: WordState }>(),
      durationReferenceDate: new Date(),
      duration: 0,
      durationInterval: undefined,
      amount: 0
    };

    game.gameStateChanged.next({
      previous: game.gameState,
      current: game.gameState = { state: 'started', reason: 'started' }
    });

    return this.gameLogEntityService.startGameLog(mode).pipe(
      tap((gameLogEntity) => game.gameLogEntity = gameLogEntity),
      tap((gameLogEntity) => {
        if (game.durationInterval) {
          clearInterval(game.durationInterval);
        }

        game.durationInterval = setInterval(() => {
          if (game.gameState.state === 'started') {
            const now = new Date();
            game.duration += now.getTime() - game.durationReferenceDate.getTime();
            game.durationReferenceDate = now;

            this.reachedGoal(game).subscribe();
          }
        }, 500);
      }),
      switchMap((gameLogEntity) => this.nextWord(game)),
      map((searchResult) => game)
    );
  }

  public nextWord(game: Game): Observable<SearchResult> {
    console.log('nextWord');
    game.word = undefined;
    game.wordState = { state: 'undefined', reason: 'next-word' };

    return this.reachedGoal(game).pipe(
      filter((reachedGoal) => !reachedGoal),
      switchMap((reachedGoal) => this.findWords(game.mode, Object.assign({}, game.searchOptions, { limit: 1 }))),
      switchMap((searchResults) => {
        if (searchResults.length === 0) {
          return this.stopGame(game, 'no-more-words').pipe(
            map((gameLogEntity) => null)
          );
        }

        game.word = searchResults[0];
        game.wordState = { state: 'covered', reason: 'covered' };
        return of(game.word);
      }),
      catchError((error) => this.stopGame(game, 'no-more-words').pipe(
        map((gameLogEntity) => null)
      )),
    );
  }

  public coverWord(game: Game): Observable<Game> {
    console.log('coverWord');
    if (game.gameState.state === 'started' && game.wordState.state === 'uncovered') {
      game.wordStateChanged.next({
        previous: game.wordState,
        current: game.wordState = { state: 'covered', reason: 'by-user' }
      });
    }

    return of(game);
  }

  public uncoverWord(game: Game): Observable<Game> {
    console.log('uncoverWord');
    if (game.gameState.state === 'started' && game.wordState.state === 'covered') {
      game.wordStateChanged.next({
        previous: game.wordState,
        current: game.wordState = { state: 'uncovered', reason: 'by-user' }
      });
    }

    return of(game);
  }

  public solveWordCorrect(game: Game): Observable<Game> {
    console.log('solveWordCorrect');
    if (game.gameState.state === 'started' && game.wordState.state === 'uncovered') {
      game.amount++;
      const translatedWord = game.word.doc.texts[game.word.key.textIndex].words[game.word.key.answerLanguage];
      translatedWord.games = translatedWord.games || {};
      translatedWord.games[game.mode] = translatedWord.games[game.mode] || {
        date: new Date(),
        level: 0
      };

      translatedWord.games[game.mode].level++;
      translatedWord.games[game.mode].date = new Date();

      return this.db.putEntity(game.word.doc).pipe(
        switchMap((wordEntity) => this.gameLogEntityService.incrementCorrect(game.gameLogEntity, game.durationReferenceDate)),
        tap((gameLogEntity) => game.gameLogEntity = gameLogEntity),
        tap((gameLogEntity) => game.wordStateChanged.next({
          previous: game.wordState,
          current: game.wordState = { state: 'solved', reason: 'correct' }
        })),
        map((gameLogEntity) => game)
      );
    }

    return of(game);
  }

  public solveWordWrong(game: Game): Observable<Game> {
    console.log('solveWordWrong');
    if (game.gameState.state === 'started' && game.wordState.state === 'uncovered') {
      game.amount++;
      const translatedWord = game.word.doc.texts[game.word.key.textIndex].words[game.word.key.answerLanguage];
      translatedWord.games = translatedWord.games || {};
      translatedWord.games[game.mode] = translatedWord.games[game.mode] || {
        date: new Date(),
        level: 0
      };

      translatedWord.games[game.mode].level = 0;
      translatedWord.games[game.mode].date = new Date();

      return this.db.putEntity(game.word.doc).pipe(
        switchMap((wordEntity) => this.gameLogEntityService.incrementWrong(game.gameLogEntity, game.durationReferenceDate)),
        tap((gameLogEntity) => game.gameLogEntity = gameLogEntity),
        tap((gameLogEntity) => game.wordStateChanged.next({
          previous: game.wordState,
          current: game.wordState = { state: 'solved', reason: 'wrong' }
        })),
        map((gameLogEntity) => game)
      );
    }

    return of(game);
  }

  private reachedGoal(game: Game): Observable<boolean> {
    switch (game.searchOptions.mode) {
      case 'by-amount':
        if (game.amount === game.searchOptions.amount) {
          return this.stopGame(game, 'reached-amount').pipe(
            map((gameLogEntity) => true)
          );
        }
        return of(false);
      case 'by-time':
        const minutes = game.duration / 1000 / 60;
        if (minutes >= game.searchOptions.minutes) {
          return this.stopGame(game, 'reached-minutes').pipe(
            map((gameLogEntity) => true)
          );
        }
        return of(false);
      default:
        return throwError(`Unsupported mode: ${game.searchOptions.mode}`);
    }
  }

  public pauseGame(game: Game): Observable<Game> {
    console.log('pauseGame');
    game.gameStateChanged.next({
      previous: game.gameState,
      current: game.gameState = { state: 'paused', reason: 'paused' }
    });
    return of(game);
  }

  public resumeGame(game: Game): Observable<Game> {
    console.log('resumeGame');
    game.durationReferenceDate = new Date();
    game.gameStateChanged.next({
      previous: game.gameState,
      current: game.gameState = { state: 'started', reason: 'started' }
    });
    return of(game);
  }

  public stopGame(game: Game, reason: 'no-more-words' | 'reached-amount' | 'reached-minutes' | 'stopped'): Observable<Game> {
    console.log('stopGame', game, reason);
    if (['started', 'paused'].indexOf(game.gameState.state) === -1) {
      return throwError(`Game is not started`);
    }

    if (game.durationInterval) {
      clearInterval(game.durationInterval);
    }

    return this.gameLogEntityService.finishGameLog(game.gameLogEntity, game.durationReferenceDate).pipe(
      tap((gameLogEntity) => game.gameLogEntity = gameLogEntity),
      tap((gameLogEntity) => game.gameStateChanged.next({
        previous: game.gameState,
        current: game.gameState = { state: 'stopped', reason: reason }
      })),
      map((gameLogEntity) => game)
    );
  }

  public findWords(mode: string, options: SearchOptions): Observable<SearchResult[]> {
    return this.findWordsInternal(mode, Object.assign({}, options, {
      limit: options.searchLevelEnabled ? 100 : 1
    })).pipe(
      switchMap((words) => {
        if (words.length === 0) {
          return of(words);
        }

        const word = options.searchLevelEnabled
          ? words.find((w) => options.searchLevelMinimum <= w.key.answerLevel && w.key.answerLevel <= options.searchLevelMaximum)
          : words[0];
        return word ? of([word]) : this.findWords(mode, Object.assign({}, options, {
          reoccurAfter: words[words.length - 1].key.reoccurAt + '1'
        }));
      }),
      map((searchResults) => searchResults.map((searchResult) => Object.assign(searchResult, {
        key: Object.assign(searchResult.key, { answerAt: new Date(searchResult.key.answerAt) })
      })))
    );
  }

  private findWordsInternal(mode: string, options: SearchOptions): Observable<SearchResult[]> {
    if (options.sourceLanguage === options.targetLanguage) {
      return throwError(`Source language and target language is the same, that's too easy, bro.`);
    }

    options.reoccurBefore = options.reoccurBefore || new Date();
    options.mod = options.mod || 6;
    options.searchLanguages = options.searchLanguages || [options.sourceLanguage, options.targetLanguage];

    if (options.searchLanguages.some((language) => [options.sourceLanguage, options.targetLanguage].indexOf(language) === -1)) {
      return throwError(`Can't search for other languages than source language and/or target language`);
    }

    const langs = JSON.stringify([options.sourceLanguage, options.targetLanguage]);
    const viewId = `words-${mode}-${options.sourceLanguage}-${options.targetLanguage}-${options.mod}`;
    return this.db.executeQuery<SearchResultKey>({
      designDocument: 'words',
      viewName: viewId,
      mapFunction(emit) {
        return `function (doc) {
          const mode = '${mode}';
          const sourceLanguage = '${options.sourceLanguage}';
          const targetLanguage = '${options.targetLanguage}';
          const mod = ${options.mod};

          function normalizeDate(d) {
            return new Date(d.getTime()
              - (d.getUTCHours() * 60 * 60 * 1000)
              - (d.getUTCMinutes() * 60 * 1000)
              - (d.getUTCSeconds() * 1000)
              - (d.getUTCMilliseconds()));
          }

          function calculateDistance(a, b) {
            return a.getTime() - b.getTime();
          }

          function convertDays(millis) {
            return millis / (24 * 60 * 60 * 1000);
          }

          function convertMillis(days) {
            return days * 24 * 60 * 60 * 1000;
          }

          function calculateHash(s) {
            var result = 0, i, chr;
            if (s.length === 0) return result;
            for (i = 0; i < s.length; i++) {
              chr   = s.charCodeAt(i);
              result  = ((result << 5) - result) + chr;
              result |= 0;
            }
            return result;
          }

          function getRequiredDistance(level, mod) {
            return level % mod === 0 ? 0 : Math.pow(2, (level % mod) - 1);
          }

          function getRequiredLanguage(level, mod, sourceLanguage, targetLanguage) {
            return level % (mod * 2) < mod ? sourceLanguage : targetLanguage;
          }

          function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target == null) { // TypeError if undefined or null
              throw new TypeError('Cannot convert undefined or null to object');
            }

            var to = Object(target);
            for (var index = 1; index < arguments.length; index++) {
              var nextSource = arguments[index];

              if (nextSource != null) { // Skip over if undefined or null
                for (var nextKey in nextSource) {
                  // Avoid bugs when hasOwnProperty is shadowed
                  if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                    to[nextKey] = nextSource[nextKey];
                  }
                }
              }
            }
            return to;
          }

          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.forEach(function (text, textIndex) {
              [sourceLanguage, targetLanguage]
                .map(function (language) {
                  return { language: language, word: text.words[language] };
                })
                .forEach(function (langAndWord) {
                  const answerLanguage = langAndWord.language;
                  const answerWord = langAndWord.word;
                  if (!answerWord) {
                    return;
                  }

                  const questionLanguage = answerLanguage === sourceLanguage ? targetLanguage : sourceLanguage;
                  const questionWord = text.words[questionLanguage];
                  if (!questionWord) {
                    return;
                  }

                  const createdAt = normalizeDate(new Date(doc.createdAt))

                  const answerLevel = (answerWord.games && answerWord.games[mode] && answerWord.games[mode].level) || 0;
                  const answerThen = new Date((answerWord.games && answerWord.games[mode] && answerWord.games[mode].date)
                    || createdAt.getTime());

                  const requiredLanguage = getRequiredLanguage(answerLevel, mod, sourceLanguage, targetLanguage);
                  const requiredDistance = getRequiredDistance(answerLevel, mod);
;
                  const reoccurAt = new Date(normalizeDate(answerThen).getTime() + convertMillis(requiredDistance));
                  if (reoccurAt.getTime() === createdAt.getTime()) {
                    reoccurAt.setDate(reoccurAt.getDate() + 1);
                  }

                  const reoccurAtSame = reoccurAt.getTime() === normalizeDate(answerThen).getTime();
                  if (reoccurAtSame) {
                    reoccurAt.setSeconds(reoccurAt.getSeconds() + (300 + Math.floor(Math.random() * 900)));
                  }

                  const indexKey = {
                    reoccurAt: reoccurAt,
                    answerHash: calculateHash(answerWord.value),
                    answerLevel: answerLevel,
                    answerLanguage: answerLanguage,
                    answerAt: answerThen,
                    answer: answerWord.value,
                    questionLanguage: questionLanguage,
                    question: questionWord.value,
                    tags: text.tags,
                    meta: text.meta,
                    textIndex: textIndex
                  };
                  if (requiredLanguage === answerLanguage) {
                    // for searching words in both directions, level dependent
                    emit(assign({
                      searchLanguages: [sourceLanguage, targetLanguage]
                    }, indexKey));
                    emit(assign({
                      searchLanguages: [targetLanguage, sourceLanguage]
                    }, indexKey));
                  }

                  // for searching directly for words in target language, independent of current level
                  emit(assign({
                    searchLanguages: [answerLanguage]
                  }, indexKey));
                });
            });
          }
        }`;
      },
      include_docs: true,
      startkey: {
        searchLanguages: options.searchLanguages,
        reoccurAt: typeof options.reoccurAfter === 'object'
          ? options.reoccurAfter.toISOString()
          : typeof options.reoccurAfter === 'string' ? options.reoccurAfter : '',
        answerHash: options.answerHash || 0,
      },
      endkey: {
        searchLanguages: options.searchLanguages,
        reoccurAt: typeof options.reoccurBefore === 'object'
          ? options.reoccurBefore.toISOString()
          : typeof options.reoccurBefore === 'string' ? options.reoccurBefore : undefined,
        answerHash: Number.MAX_VALUE
      },
      limit: options.limit
    }).pipe(
      map((result) => result.rows)
    );
  }
}
