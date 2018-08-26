import { Injectable } from '@angular/core';

import { throwError, Observable, of, Subject, pipe, BehaviorSubject, Subscription } from 'rxjs';
import { map, switchMap, catchError, tap, filter } from 'rxjs/operators';

import { Database, DatabaseRunQueryOptions } from '../database';
import { SearchOptions } from '../search-options';
import { SearchResult, SearchResultKey } from '../search-result';
import { WordEntityService, WordEntity } from '../words';
import { GameLogEntityService, GameLogEntity } from '../game-log';
import { Game } from './game';
import { GameState } from './game-state';
import { WordState } from './word-state';
import { preserveWhitespacesDefault } from '@angular/compiler';

@Injectable()
export class GameService {
  private db: Database<WordEntity>;

  private nextWordSubscription: Subscription;

  public constructor(
    private wordEntityService: WordEntityService,
    private gameLogEntityService: GameLogEntityService
  ) {
    this.db = wordEntityService.getDatabase();
  }

  public startGame(mode: string, searchOptions: SearchOptions): Observable<Game> {
    const game: Game = {
      mode: mode,
      searchOptions: searchOptions,
      gameLogEntity: undefined,
      gameState: { state: 'undefined', reason: 'undefined' },
      gameStateChanged: new BehaviorSubject<{ previous: GameState, current: GameState }>({
        previous: { state: 'undefined', reason: 'undefined' },
        current: { state: 'undefined', reason: 'undefined' }
      }),
      word: undefined,
      wordState: { state: 'undefined', reason: 'undefined' },
      wordStateChanged: new BehaviorSubject<{ previous: WordState, current: WordState }>({
        previous: { state: 'undefined', reason: 'undefined' },
        current: { state: 'undefined', reason: 'undefined' }
      }),
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
      switchMap((gameLogEntity) => this.nextWord(game)),
      tap((searchResult) => {
        if (game.durationInterval) {
          clearInterval(game.durationInterval);
        }

        game.durationReferenceDate = new Date();
        game.durationInterval = setInterval(() => {
          if (game.gameState.state === 'started') {
            this.gameLogEntityService.pingGameLog(game.gameLogEntity, game.durationReferenceDate);
            const now = new Date();
            game.duration += now.getTime() - game.durationReferenceDate.getTime();
            game.durationReferenceDate = now;

            this.reachedGoal(game).subscribe();
          }
        }, 500);
      }),
      map((searchResult) => game)
    );
  }

  public nextWord(game: Game): Observable<SearchResult> {
    if (game.gameState.state === 'started') {
      game.word = undefined;
      game.wordStateChanged.next({
        previous: game.wordState,
        current: game.wordState = { state: 'undefined', reason: 'next-word' }
      });

      return this.pauseGame(game).pipe(
        switchMap(() => this.reachedGoal(game)),
        switchMap((reachedGoal) => reachedGoal ? of([]) : this.nextWordInternal(game)),
        tap(() => this.resumeGame(game)),
        switchMap((searchResults) => {
          if (searchResults.length === 0) {
            return ['started', 'paused'].indexOf(game.gameState.state) === -1 ? of(null) : this.stopGame(game, 'no-more-words').pipe(
              map((gameLogEntity) => null)
            );
          }

          game.word = searchResults[0];
          game.wordStateChanged.next({
            previous: game.wordState,
            current: game.wordState = { state: 'covered', reason: 'covered' }
          });
          return of(game.word);
        })
      );
    }

    return throwError(`Cannot get next word in a not started game`);
  }

  private nextWordInternal(game: Game): Observable<SearchResult[]> {
    console.log('loading new word');
    if (game.nextWords) {
      const possibleWords = game.nextWords
        .filter((searchResult) => new Date().getTime() - new Date(searchResult.key.reoccurAt as string).getTime() >= 0);
      const levels = possibleWords
        .map((searchResult) => searchResult.key.answerLevel)
        .reduce((prev, cur) => prev.indexOf(cur) === -1 ? prev.concat([cur]) : prev, [])
        .sort()
        .reverse();
      if (levels.length === 0) {
        return of([]);
      }

      const levelsHigherThanNothing = possibleWords
        .filter((searchResult) => searchResult.key.answerLevel >= 0)
        .map((searchResult) => searchResult.key.answerLevel);
      let nextWordLevel = levels[0];
      if (levelsHigherThanNothing.length > 0) {
        nextWordLevel = levelsHigherThanNothing[Math.max(Math.min(Math.round(Math.random() * (levelsHigherThanNothing.length - 1)),
          levelsHigherThanNothing.length - 1), 0)];
      }

      const wordsByLevel = levels.map((level) => possibleWords.filter((searchResult) => searchResult.key.answerLevel === level));
      const nextWord = possibleWords.find((searchResult) => searchResult.key.answerLevel === nextWordLevel);
      if (!nextWord) {
        return of([]);
      }

      const nextWordIndex = game.nextWords.indexOf(nextWord);
      if (nextWordIndex !== -1) {
        game.nextWords.splice(nextWordIndex, 1);
      }
      return of([nextWord]);
    }

    return this.findWords(game.mode, game.searchOptions).pipe(
      tap((searchResults) => game.nextWords = searchResults),
      switchMap((searchResults) => this.nextWordInternal(game))
    );
  }

  public coverWord(game: Game): Observable<Game> {
    if (game.gameState.state === 'started' && game.wordState.state === 'uncovered') {
      game.wordStateChanged.next({
        previous: game.wordState,
        current: game.wordState = { state: 'covered', reason: 'by-user' }
      });
      return of(game);
    }

    return throwError(`Cannot cover a covered word or game not started`);
  }

  public uncoverWord(game: Game): Observable<Game> {
    if (game.gameState.state === 'started' && game.wordState.state === 'covered') {
      game.wordStateChanged.next({
        previous: game.wordState,
        current: game.wordState = { state: 'uncovered', reason: 'by-user' }
      });
      return of(game);
    }

    return throwError(`Cannot uncover a uncovered word or game not started`);
  }

  public solveWordCorrect(game: Game): Observable<Game> {
    if (game.gameState.state === 'started' && game.wordState.state === 'uncovered') {
      game.amount++;
      const translatedWord = game.word.doc.texts[game.word.key.textIndex].words[game.word.key.answerLanguage];
      translatedWord.games = translatedWord.games || {};
      translatedWord.games[game.mode] = translatedWord.games[game.mode] || {
        date: new Date(),
        level: 0
      };

      if (game.word.key.answerLevel === -1) {
        translatedWord.games[game.mode].level = 0;
      } else {
        translatedWord.games[game.mode].level++;
      }

      translatedWord.games[game.mode].date = new Date();

      const saveWord = () => {
        const observable = this.db.putEntity(game.word.doc).pipe(
          switchMap(() => this.gameLogEntityService.incrementCorrect(game.gameLogEntity, game.durationReferenceDate)),
          tap((gameLogEntity) => game.gameLogEntity = gameLogEntity)
        );
        if (game.nextWord) {
          observable.subscribe();
          return of(game.gameLogEntity);
        }

        return observable;
      };

      return this.pauseGame(game).pipe(
        switchMap(() => saveWord()),
        switchMap(() => this.resumeGame(game)),
        tap(() => game.wordStateChanged.next({
          previous: game.wordState,
          current: game.wordState = { state: 'solved', reason: 'correct' }
        }))
      );
    }

    return throwError(`Cannot solve covered word or game not started`);
  }

  public solveWordWrong(game: Game): Observable<Game> {
    if (game.gameState.state === 'started' && game.wordState.state === 'uncovered') {
      game.amount++;
      const translatedWord = game.word.doc.texts[game.word.key.textIndex].words[game.word.key.answerLanguage];
      translatedWord.games = translatedWord.games || {};
      translatedWord.games[game.mode] = translatedWord.games[game.mode] || {
        date: new Date(),
        level: 0
      };

      game.word.key.answerLevel = 0;
      translatedWord.games[game.mode].level = 0;
      translatedWord.games[game.mode].date = new Date();

      if (game.nextWords && game.nextWords.indexOf(game.word) === -1) {
        game.word.key.reoccurAt = new Date(game.word.key.reoccurAt as string);
        game.word.key.reoccurAt.setSeconds(game.word.key.reoccurAt.getSeconds() + 30 + Math.random() * 90);
        game.nextWords.push(game.word);
      }

      const saveWord = () => {
        const observable = this.db.putEntity(game.word.doc).pipe(
          switchMap(() => this.gameLogEntityService.incrementWrong(game.gameLogEntity, game.durationReferenceDate)),
          tap((gameLogEntity) => game.gameLogEntity = gameLogEntity)
        );
        if (game.nextWord) {
          observable.subscribe();
          return of(game.gameLogEntity);
        }

        return observable;
      };

      return this.pauseGame(game).pipe(
        switchMap(() => saveWord()),
        switchMap(() => this.resumeGame(game)),
        tap((gameLogEntity) => game.wordStateChanged.next({
          previous: game.wordState,
          current: game.wordState = { state: 'solved', reason: 'wrong' }
        })),
      );
    }

    return throwError(`Cannot solve covered word or game not started`);
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
    if (game.gameState.state === 'paused') {
      return of(game);
    }

    if (game.gameState.state === 'started') {
      this.gameLogEntityService.pingGameLog(game.gameLogEntity, game.durationReferenceDate);
      const now = new Date();
      game.duration += now.getTime() - game.durationReferenceDate.getTime();
      game.durationReferenceDate = now;
      game.gameStateChanged.next({
        previous: game.gameState,
        current: game.gameState = { state: 'paused', reason: 'paused' }
      });
      return of(game);
    }

    return throwError(`Cannot pause a paused game`);
  }

  public resumeGame(game: Game): Observable<Game> {
    if (game.gameState.state === 'started') {
      return of(game);
    }

    if (game.gameState.state === 'paused') {
      game.durationReferenceDate = new Date();
      game.gameStateChanged.next({
        previous: game.gameState,
        current: game.gameState = { state: 'started', reason: 'started' }
      });
      return of(game);
    }

    return throwError(`Canont resume a not paused game`);
  }

  public stopGame(game: Game, reason: 'no-more-words' | 'reached-amount' | 'reached-minutes' | 'stopped'): Observable<Game> {
    if (game.gameState.state === 'stopped') {
      return of(game);
    }

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
    return this.findWordsInternal(mode, options).pipe(
      map((searchResults) => options.searchLevelEnabled
        ? searchResults.filter((w) => options.searchLevelMinimum <= w.key.answerLevel && w.key.answerLevel <= options.searchLevelMaximum)
        : searchResults),
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
    return this.db.executeQuery<SearchResultKey>({
      designDocument: 'words',
      viewName: `words-${mode}-${options.sourceLanguage}-${options.targetLanguage}-${options.mod}`,
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
            return level === -1 || level % mod === 0 ? 0 : Math.pow(2, (level % mod) - 1);
          }

          function getRequiredLanguage(level, mod, sourceLanguage, targetLanguage) {
            return level === -1 || level % (mod * 2) < mod ? sourceLanguage : targetLanguage;
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
              if (text.tags && text.tags.indexOf('ignore') !== -1) {
                return;
              }

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

                  const createdAt = normalizeDate(new Date(doc.createdAt));

                  const answerHash = calculateHash(answerWord.value);
                  const answerLevel = (answerWord.games && answerWord.games[mode] && answerWord.games[mode].level) || -1;
                  const answerThen = new Date((answerWord.games && answerWord.games[mode] && answerWord.games[mode].date)
                    || (new Date(doc.createdAt).getTime() + Math.abs(answerHash)));

                  const requiredLanguage = getRequiredLanguage(answerLevel, mod, sourceLanguage, targetLanguage);
                  const requiredDistance = getRequiredDistance(answerLevel, mod);
;
                  const reoccurAt = new Date(normalizeDate(answerThen).getTime() + convertMillis(requiredDistance)
                    + Math.round(Math.random() * 2 * 86400000));

                  const indexKey = {
                    reoccurAt: reoccurAt,
                    answerHash: answerHash,
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
      limit: options.limit,
      skip: options.skip
    }).pipe(
      map((result) => result.rows)
    );
  }

  public getMinimumLevel(mode: string): Observable<number> {
    return this.db.executeQuery<{}, number, number>({
      designDocument: 'words',
      viewName: `min-level-${mode}`,
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substring(0, 'word_'.length) === 'word_') {
            const mode = '${mode}';
            doc.texts.forEach(function (text) {
              Object.keys(text.words).forEach(function (lang) {
                if (text.words[lang].games && text.words[lang].games[mode]) {
                  emit(undefined, text.words[lang].games[mode].level);
                }
              });
            });
          }
        }`;
      },
      reduceFunction() {
        return `function (keys, values, rereduce) {
          return Math.min.apply(null, values);
        }`;
      }
    }).pipe(
      map((result) => result.rows.length > 0 ? result.rows[0].value : 0)
    );
  }

  public getMaximumLevel(mode: string): Observable<number> {
    return this.db.executeQuery<{}, number, number>({
      designDocument: 'words',
      viewName: `max-level-${mode}`,
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substring(0, 'word_'.length) === 'word_') {
            const mode = '${mode}';
            doc.texts.forEach(function (text) {
              Object.keys(text.words).forEach(function (lang) {
                if (text.words[lang].games && text.words[lang].games[mode]) {
                  emit(undefined, text.words[lang].games[mode].level);
                }
              });
            });
          }
        }`;
      },
      reduceFunction() {
        return `function (keys, values, rereduce) {
          return Math.max.apply(null, values);
        }`;
      }
    }).pipe(
      map((result) => result.rows.length > 0 ? result.rows[0].value : 0)
    );
  }

  public getWrongWords(mode: string, options?: Partial<DatabaseRunQueryOptions<Date>>): Observable<WordEntity[]> {
    return this.db.executeQuery<Date>(Object.assign({
      designDocument: 'words',
      viewName: `wrong-words-${mode}`,
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substring(0, 'word_'.length) === 'word_') {
            const mode = '${mode}';
            doc.texts.forEach(function (text) {
              Object.keys(text.words).forEach(function (lang) {
                if (text.words[lang].games && text.words[lang].games[mode] && text.words[lang].games[mode].level === 0) {
                  emit(text.words[lang].games[mode].date);
                }
              });
            });
          }
        }`;
      },
      include_docs: true,
      descending: true
    }, options)).pipe(
      map((result) => result.rows.map((row) => row.doc))
    );
  }
}
