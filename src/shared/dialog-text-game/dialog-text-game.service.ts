import { Injectable } from '@angular/core';

import { throwError, Observable, of, Subject, pipe, BehaviorSubject, Subscription } from 'rxjs';
import { map, switchMap, catchError, tap, filter } from 'rxjs/operators';

import { Database, DatabaseRunQueryOptions } from '../database';
import { DialogTextSearchOptions } from './dialog-text-search-options';
import { DialogTextSearchResult } from './dialog-text-search-result';
import { DialogTextSearchResultKey } from './dialog-text-search-result-key';
import { WordEntityService, WordEntity } from '../words';
import { GameLogEntityService, GameLogEntity } from '../game-log';
import { DialogTextGame } from './dialog-text-game';
import { DialogTextGameState } from './dialog-text-game-state';
import { DialogTextWordState } from './dialog-text-word-state';

import * as XRegExp from 'xregexp/xregexp-all';
import Diff from 'diff/lib/diff/base';
import { generateOptions } from 'diff/lib/util/params';

// copied and adapted from diff/lib/diff/word:
// Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
//
// Ranges and exceptions:
// Latin-1 Supplement, 0080–00FF
//  - U+00D7  × Multiplication sign
//  - U+00F7  ÷ Division sign
// Latin Extended-A, 0100–017F
// Latin Extended-B, 0180–024F
// IPA Extensions, 0250–02AF
// Spacing Modifier Letters, 02B0–02FF
//  - U+02C7  ˇ &#711;  Caron
//  - U+02D8  ˘ &#728;  Breve
//  - U+02D9  ˙ &#729;  Dot Above
//  - U+02DA  ˚ &#730;  Ring Above
//  - U+02DB  ˛ &#731;  Ogonek
//  - U+02DC  ˜ &#732;  Small Tilde
//  - U+02DD  ˝ &#733;  Double Acute Accent
// Latin Extended Additional, 1E00–1EFF
const extendedWordChars = /^[a-zA-Z\u{C0}-\u{FF}\u{D8}-\u{F6}\u{F8}-\u{2C6}\u{2C8}-\u{2D7}\u{2DE}-\u{2FF}\u{1E00}-\u{1EFF}]+$/u;
const reWhitespace = /\S/;
const wordDiff = Object.assign(new Diff(), {
  equals(left, right) {
    function sanitize(word) {
      const regexp = XRegExp(`[^\\pL]`, 'g');
      return XRegExp.replace(word, regexp, '', 'all');
    }

    if (this.options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }

    if (this.options.ignoreSpecialChars) {
      left = sanitize(left);
      right = sanitize(right);
    }

    // process.stdout.write('comparing "' + left + '" with "' + right + '"\n');
    return left === right || (this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right));
  },

  tokenize(value) {
    const tokens = value.split(/(\s+|\b)/);

    // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.
    for (let i = 0; i < tokens.length - 1; i++) {
      // If we have an empty string in the next field and we have only word chars before and after, merge
      if (!tokens[i + 1] && tokens[i + 2]
        && extendedWordChars.test(tokens[i])
        && extendedWordChars.test(tokens[i + 2])) {
        tokens[i] += tokens[i + 2];
        tokens.splice(i + 1, 2);
        i--;
      }
    }

    return tokens;
  }
});

function diffWords(oldStr, newStr, options) {
  return wordDiff.diff(oldStr, newStr, generateOptions(options, {
    ignoreWhitespace: true,
    ignoreCase: true,
    ignoreSpecialChars: true
  }));
}

@Injectable()
export class DialogTextGameService {
  private db: Database<WordEntity>;

  private nextWordSubscription: Subscription;

  public constructor(
    private wordEntityService: WordEntityService,
    private gameLogEntityService: GameLogEntityService
  ) {
    this.db = wordEntityService.getDatabase();
  }

  public startGame(mode: string, searchOptions: DialogTextSearchOptions): Observable<DialogTextGame> {
    const dialogTextGame: DialogTextGame = {
      mode: mode,
      searchOptions: searchOptions,
      gameLogEntity: undefined,
      gameState: { state: 'undefined', reason: 'undefined' },
      gameStateChanged: new BehaviorSubject<{ previous: DialogTextGameState, current: DialogTextGameState }>({
        previous: { state: 'undefined', reason: 'undefined' },
        current: { state: 'undefined', reason: 'undefined' }
      }),
      word: undefined,
      wordState: [],
      wordStateChanged: new BehaviorSubject<{ previous: DialogTextWordState[], current: DialogTextWordState[] }>({
        previous: [],
        current: []
      }),
      durationReferenceDate: new Date(),
      duration: 0,
      durationInterval: undefined
    };

    dialogTextGame.gameStateChanged.next({
      previous: dialogTextGame.gameState,
      current: dialogTextGame.gameState = { state: 'started', reason: 'started' }
    });

    return this.gameLogEntityService.startGameLog(mode).pipe(
      tap((gameLogEntity) => dialogTextGame.gameLogEntity = gameLogEntity),
      switchMap((gameLogEntity) => this.nextWord(dialogTextGame)),
      tap((searchResult) => {
        if (dialogTextGame.durationInterval) {
          clearInterval(dialogTextGame.durationInterval);
        }

        dialogTextGame.durationReferenceDate = new Date();
        dialogTextGame.durationInterval = setInterval(() => {
          if (dialogTextGame.gameState.state === 'started') {
            this.gameLogEntityService.pingGameLog(dialogTextGame.gameLogEntity, dialogTextGame.durationReferenceDate);
            const now = new Date();
            dialogTextGame.duration += now.getTime() - dialogTextGame.durationReferenceDate.getTime();
            dialogTextGame.durationReferenceDate = now;
          }
        }, 500);
      }),
      map((searchResult) => dialogTextGame)
    );
  }

  private nextWord(dialogTextGame: DialogTextGame): Observable<DialogTextSearchResult> {
    if (dialogTextGame.gameState.state === 'started') {
      dialogTextGame.word = undefined;
      // game.wordStateChanged.next({
      //   previous: game.wordState,
      //   current: game.wordState = { state: 'undefined', reason: 'next-word' }
      // });

      return this.findWords(dialogTextGame.mode, dialogTextGame.searchOptions).pipe(
        switchMap((searchResults) => {
          if (searchResults.length === 0) {
            return ['started', 'paused'].indexOf(dialogTextGame.gameState.state) === -1
              ? of(null)
              : this.stopGame(dialogTextGame, 'no-more-words').pipe(
                map((gameLogEntity) => null)
              );
          }

          console.log('search results', searchResults);
          dialogTextGame.word = searchResults[0];
          dialogTextGame.wordStateChanged.next({
            previous: dialogTextGame.wordState,
            current: dialogTextGame.wordState = dialogTextGame.word.key.answers.map((answer) => ({
              state: 'covered' as 'covered',
              reason: 'covered' as 'covered'
            }))
          });
          return of(dialogTextGame.word);
        })
      );
    }

    return throwError(`Cannot get next word in a not started game`);
  }

  public coverWord(dialogTextGame: DialogTextGame, index: number): Observable<DialogTextGame> {
    if (dialogTextGame.gameState.state === 'started' && dialogTextGame.wordState[index].state === 'uncovered') {
      dialogTextGame.wordStateChanged.next({
        previous: dialogTextGame.wordState,
        current: dialogTextGame.wordState = this.transition(dialogTextGame.wordState, index, { state: 'covered', reason: 'by-user' })
      });
      return of(dialogTextGame);
    }

    return throwError(`Cannot cover a covered word or game not started`);
  }

  public uncoverWord(dialogTextGame: DialogTextGame, index: number): Observable<DialogTextGame> {
    if (dialogTextGame.gameState.state === 'started' && dialogTextGame.wordState[index].state === 'covered') {
      dialogTextGame.wordStateChanged.next({
        previous: dialogTextGame.wordState,
        current: dialogTextGame.wordState = this.transition(dialogTextGame.wordState, index, { state: 'uncovered', reason: 'by-user' })
      });
      return of(dialogTextGame);
    }

    return throwError(`Cannot uncover a uncovered word or game not started`);
  }

  public testAnswer(dialogTextGame: DialogTextGame, index: number, answer: string): {
    errors: number,
    diff: {
      count: number,
      value: string,
      added: boolean,
      removed: boolean
    }[]
  } {
    if (dialogTextGame.gameState.state === 'started') {
      const translatedWord = dialogTextGame.word.doc.texts[index].words[dialogTextGame.word.key.answerLanguage];

      const actualAnswer = answer;
      const expectedAnswer = translatedWord.value;

      const diff = diffWords(actualAnswer, expectedAnswer, undefined);
      const errors = diff
        .map((part, i) => {
          if (part.removed) {
            return 1;
          }

          if (part.added) {
            const prev = diff[i - 1];
            return prev && prev.removed ? 0 : 1;
          }

          return 0;
        })
        .reduce((prev, cur) => prev + cur, 0);
      return {
        errors,
        diff
      };
    }

    throw new Error(`Cannot test answer without being in a started game`);
  }

  public saveWord(dialogTextGame: DialogTextGame): Observable<DialogTextGame> {
    return this.db.putEntity(dialogTextGame.word.doc).pipe(
      tap((word) => dialogTextGame.word.doc._rev = word._rev),
      map((word) => dialogTextGame)
    );
  }

  public solveWordCorrect(dialogTextGame: DialogTextGame, index: number, answer: string): Observable<DialogTextGame> {
    if (dialogTextGame.gameState.state === 'started' && dialogTextGame.wordState[index].state === 'uncovered') {
      const translatedWord = dialogTextGame.word.doc.texts[index].words[dialogTextGame.word.key.answerLanguage];
      translatedWord.games = translatedWord.games || {};
      translatedWord.games[dialogTextGame.mode] = translatedWord.games[dialogTextGame.mode] || {
        date: new Date(),
        level: 0
      };

      if (dialogTextGame.word.key.answerLevel === -1) {
        translatedWord.games[dialogTextGame.mode].level = 0;
      } else {
        translatedWord.games[dialogTextGame.mode].level++;
      }

      translatedWord.games[dialogTextGame.mode].date = new Date();
      translatedWord.games[dialogTextGame.mode].answer = answer;
      translatedWord.games[dialogTextGame.mode].correct = true;
      translatedWord.games[dialogTextGame.mode].errors = 0; // this.testAnswer(dialogTextGame, index, answer).errors;

      const saveWord = () => {
        return this.db.putEntity(dialogTextGame.word.doc).pipe(
          tap((word) => dialogTextGame.word.doc._rev = word._rev),
          switchMap(() => this.gameLogEntityService.incrementCorrect(dialogTextGame.gameLogEntity, dialogTextGame.durationReferenceDate)),
          tap((gameLogEntity) => dialogTextGame.gameLogEntity = gameLogEntity)
        );
      };

      return this.pingGame(dialogTextGame).pipe(
        switchMap(() => saveWord()),
        tap(() => dialogTextGame.wordStateChanged.next({
          previous: dialogTextGame.wordState,
          current: dialogTextGame.wordState = this.transition(dialogTextGame.wordState, index, { state: 'solved', reason: 'correct' })
        })),
        map(() => dialogTextGame)
      );
    }

    return throwError(`Cannot solve covered word or game not started`);
  }

  public solveWordWrong(dialogTextGame: DialogTextGame, index: number, answer: string): Observable<DialogTextGame> {
    if (dialogTextGame.gameState.state === 'started' && dialogTextGame.wordState[index].state === 'uncovered') {
      const translatedWord = dialogTextGame.word.doc.texts[index].words[dialogTextGame.word.key.answerLanguage];
      translatedWord.games = translatedWord.games || {};
      translatedWord.games[dialogTextGame.mode] = translatedWord.games[dialogTextGame.mode] || {
        date: new Date(),
        level: 0
      };

      dialogTextGame.word.key.answerLevel = 0;
      translatedWord.games[dialogTextGame.mode].level = 0;
      translatedWord.games[dialogTextGame.mode].date = new Date();
      translatedWord.games[dialogTextGame.mode].answer = answer;
      translatedWord.games[dialogTextGame.mode].correct = false;
      translatedWord.games[dialogTextGame.mode].errors = this.testAnswer(dialogTextGame, index, answer).errors;

      const saveWord = () => {
        return this.db.putEntity(dialogTextGame.word.doc).pipe(
          tap((word) => dialogTextGame.word.doc._rev = word._rev),
          switchMap(() => this.gameLogEntityService.incrementWrong(dialogTextGame.gameLogEntity, dialogTextGame.durationReferenceDate)),
          tap((gameLogEntity) => dialogTextGame.gameLogEntity = gameLogEntity)
        );
      };

      return this.pingGame(dialogTextGame).pipe(
        switchMap(() => saveWord()),
        tap(() => dialogTextGame.wordStateChanged.next({
          previous: dialogTextGame.wordState,
          current: dialogTextGame.wordState = this.transition(dialogTextGame.wordState, index, { state: 'solved', reason: 'wrong' })
        })),
        map(() => dialogTextGame)
      );
    }

    return throwError(`Cannot solve covered word or game not started`);
  }

  public pingGame(game: DialogTextGame): Observable<DialogTextGame> {
    this.gameLogEntityService.pingGameLog(game.gameLogEntity, game.durationReferenceDate);
    return of(game);
  }

  public pauseGame(game: DialogTextGame): Observable<DialogTextGame> {
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

  public resumeGame(game: DialogTextGame): Observable<DialogTextGame> {
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

  public stopGame(
    dialogTextGame: DialogTextGame,
    reason: 'no-more-words' | 'stopped'
  ): Observable<DialogTextGame> {
    if (dialogTextGame.gameState.state === 'stopped') {
      return of(dialogTextGame);
    }

    if (['started', 'paused'].indexOf(dialogTextGame.gameState.state) === -1) {
      return throwError(`Game is not started`);
    }

    if (dialogTextGame.durationInterval) {
      clearInterval(dialogTextGame.durationInterval);
    }

    if (dialogTextGame.word) {
      const wordEntity = dialogTextGame.word.doc;
      const answerLanguage = dialogTextGame.word.key.answerLanguage;

      wordEntity.games = wordEntity.games || {};
      wordEntity.games[answerLanguage] = wordEntity.games[answerLanguage] || {};
      wordEntity.games[answerLanguage][dialogTextGame.mode] = wordEntity.games[answerLanguage][dialogTextGame.mode] || {
        date: new Date(),
        level: 0,
      };

      const everythingCorrect = wordEntity.texts
        .filter((text) => text.tags.indexOf('ignore') === -1)
        .every((text) => text.words[answerLanguage]
          && text.words[answerLanguage].games
          && text.words[answerLanguage].games[dialogTextGame.mode]
          && text.words[answerLanguage].games[dialogTextGame.mode].correct);
      if (everythingCorrect) {
        if (dialogTextGame.word.key.answerLevel === -1) {
          wordEntity.games[answerLanguage][dialogTextGame.mode].level = 0;
        } else {
          wordEntity.games[answerLanguage][dialogTextGame.mode].level++;
        }
        wordEntity.games[answerLanguage][dialogTextGame.mode].date = new Date();
      } else {
        wordEntity.games[answerLanguage][dialogTextGame.mode].level = 0;
        wordEntity.games[answerLanguage][dialogTextGame.mode].date = new Date();
      }
    }

    const saveWord = () => {
      return dialogTextGame.word ? this.db.putEntity(dialogTextGame.word.doc).pipe(
        tap((word) => dialogTextGame.word.doc._rev = word._rev)
      ) : of(null);
    };

    return this.gameLogEntityService.finishGameLog(dialogTextGame.gameLogEntity, dialogTextGame.durationReferenceDate).pipe(
      tap((gameLogEntity) => dialogTextGame.gameLogEntity = gameLogEntity),
      tap((gameLogEntity) => dialogTextGame.gameStateChanged.next({
        previous: dialogTextGame.gameState,
        current: dialogTextGame.gameState = { state: 'stopped', reason: reason }
      })),
      tap((gameLogEntity) => saveWord()),
      map((gameLogEntity) => dialogTextGame)
    );
  }

  public findWords(mode: string, options: DialogTextSearchOptions): Observable<DialogTextSearchResult[]> {
    console.log('loading new word');
    return this.findWordsInternal(mode, options).pipe(
      map((searchResults) => options.searchLevelEnabled
        ? searchResults.filter((w) => options.searchLevelMinimum <= w.key.answerLevel && w.key.answerLevel <= options.searchLevelMaximum)
        : searchResults),
      map((searchResults) => searchResults.map((searchResult) => Object.assign(searchResult, {
        key: Object.assign(searchResult.key, { answerAt: new Date(searchResult.key.answerAt) })
      })))
    );
  }

  private findWordsInternal(mode: string, options: DialogTextSearchOptions): Observable<DialogTextSearchResult[]> {
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
    return this.db.executeQuery<DialogTextSearchResultKey>({
      designDocument: 'dialog-texts',
      viewName: `dialog-texts-${mode}-${options.sourceLanguage}-${options.targetLanguage}-${options.mod}`,
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
              chr = s.charCodeAt(i);
              result = ((result << 5) - result) + chr;
              result |= 0;
            }
            return result;
          }

          function getRequiredDistance(level, mod) {
            return level === -1 ? 0 : level % mod === 0 ? 1 : Math.pow(2, (level % mod) - 1);
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
            if (!doc.texts) {
              return;
            }

            if (doc.texts.every(function(text) {
              return !text.tags || text.tags.indexOf('text') === -1;
            })) {
              return;
            }

            if (!doc.texts.some(function (text) {
              return !!text.words[sourceLanguage] && !!text.words[targetLanguage];
            })) {
              // dont do anything here, if there are no words for the given source and target language
              return;
            }

            [sourceLanguage, targetLanguage]
              .map(function (answerLanguage) {
                const questionLanguage = answerLanguage === sourceLanguage ? targetLanguage : sourceLanguage;
                const questions = doc.texts.map(function(text) {
                  return text.words[questionLanguage].value;
                });

                const createdAt = normalizeDate(new Date(doc.createdAt));

                const answerGame = (doc.games && doc.games[answerLanguage] && doc.games[answerLanguage][mode]);
                const answerLevel = (answerGame && answerGame.level !== undefined)
                  ? answerGame.level
                  : -1;
                const answerThen = (answerGame && answerGame.date)
                  ? new Date(answerGame.date)
                  : new Date(doc.createdAt);
                const answers = doc.texts.map(function(text) {
                  return text.words[answerLanguage].value;
                });

                const meta = doc.texts.map(function(text) {
                  return text.meta;
                });
                const tags = doc.texts.map(function(text) {
                  return text.tags;
                });
                const history = doc.texts.map(function(text) {
                  if (text.words
                      && text.words[answerLanguage]
                      && text.words[answerLanguage].games
                      && text.words[answerLanguage].games[mode]) {
                    return {
                      answer: text.words[answerLanguage].games[mode].answer,
                      correct: text.words[answerLanguage].games[mode].correct
                    };
                  }

                  return null;
                });
                const count = doc.texts.length;
                const countNotIgnores = doc.texts.filter(function (text) {
                  return text.tags && text.tags.indexOf('ignore') === -1;
                }).length;
                const corrects = doc.texts.filter(function (text) {
                  return text.words
                    && text.words[answerLanguage]
                    && text.words[answerLanguage].games
                    && text.words[answerLanguage].games[mode]
                    && text.words[answerLanguage].games[mode].correct
                    && text.tags
                    && text.tags.indexOf('ignore') === -1;
                }).length;
                const errorsNeg = -doc.texts
                  .map(function (text) {
                    if (text.words
                        && text.words[answerLanguage]
                        && text.words[answerLanguage].games
                        && text.words[answerLanguage].games[mode]
                        && text.tags
                        && text.tags.indexOf('ignore') === -1) {
                      return text.words[answerLanguage].games[mode].correct === false
                        && text.words[answerLanguage].games[mode].errors === undefined
                          ? 1
                          : text.words[answerLanguage].games[mode].errors;
                    }

                    return 0;
                  })
                  .reduce(function(prev, cur) {
                    return prev + cur;
                  }, 0);

                const requiredLanguage = getRequiredLanguage(answerLevel, mod, sourceLanguage, targetLanguage);
                const requiredDistance = getRequiredDistance(answerLevel, mod);

                const reoccurAt = new Date(answerThen.getTime() + convertMillis(requiredDistance)
                  + Math.round(Math.random() * 2 * 86400000));

                const indexKey = {
                  reoccurAt: reoccurAt,
                  success: corrects / countNotIgnores,
                  errorsNeg: errorsNeg,
                  answerLevel: answerLevel,
                  answerLanguage: answerLanguage,
                  answers: answers,
                  answerAt: answerLevel === -1 ? new Date(0) : answerThen,
                  questionLanguage: questionLanguage,
                  questions: questions,
                  tags: tags,
                  meta: meta,
                  history: history,
                  count: count
                };
                if (requiredLanguage === answerLanguage) {
                  // for searching in both directions, level dependent
                  emit(assign({
                    searchLanguages: [sourceLanguage, targetLanguage]
                  }, indexKey));
                  emit(assign({
                    searchLanguages: [targetLanguage, sourceLanguage]
                  }, indexKey));
                }

                // for searching directly in target language, independent of current level
                emit(assign({
                  searchLanguages: [answerLanguage]
                }, indexKey));
              });
          }
        }`;
      },
      include_docs: true,
      startkey: {
        searchLanguages: options.searchLanguages,
        reoccurAt: typeof options.reoccurAfter === 'object'
          ? options.reoccurAfter.toISOString()
          : typeof options.reoccurAfter === 'string' ? options.reoccurAfter : ''
      },
      endkey: {
        searchLanguages: options.searchLanguages,
        reoccurAt: typeof options.reoccurBefore === 'object'
          ? options.reoccurBefore.toISOString()
          : typeof options.reoccurBefore === 'string' ? options.reoccurBefore : undefined
      }
    }).pipe(
      map((result) => result.rows)
    );
  }

  public getMinimumLevel(mode: string): Observable<number> {
    return this.db.executeQuery<{}, number, number>({
      designDocument: 'dialog-text-words',
      viewName: `min-level-${mode}`,
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substring(0, 'word_'.length) === 'word_') {
            const mode = '${mode}';
            if (doc.games && doc.games[mode]) {
              emit(undefined, doc.games[mode].level);
            }
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
      designDocument: 'dialog-text-words',
      viewName: `max-level-${mode}`,
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substring(0, 'word_'.length) === 'word_') {
            const mode = '${mode}';
            if (doc.games && doc.games[mode]) {
              emit(undefined, doc.games[mode].level);
            }
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

  private transition(wordStates: DialogTextWordState[], index: number, newWordState: DialogTextWordState) {
    const newWordStates = [...wordStates];
    newWordStates.splice(index, 1, newWordState);
    return newWordStates;
  }
}
