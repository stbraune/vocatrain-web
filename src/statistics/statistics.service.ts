import { Injectable } from '@angular/core';
import { Database, GameLogEntity, GameLogEntityService } from '../shared';
import { WordEntityService } from '../app/services';

import { Observable, pipe, zip } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { WordEntity } from '../app/model';

declare const sum: any;

@Injectable()
export class StatisticsService {
  private wordEntityDatabase: Database<WordEntity>;
  private gameLogDatabase: Database<GameLogEntity>;

  public constructor(
    private wordEntityService: WordEntityService,
    private gameLogEntityService: GameLogEntityService
  ) {
    this.wordEntityDatabase = this.wordEntityService.getDatabase();
    this.gameLogDatabase = this.gameLogEntityService.getDatabase();
  }

  public getTotals(options: {
    mode: string,
    startDate?: Date,
    endDate?: Date
  }) {
    return this.queryGameLogStats(options);
  }

  public getGameLogEntities(options: {
    mode: string,
    startDate?: Date,
    endDate?: Date
  }) {
    return this.queryGameLogStats(Object.assign(options, {
      include_docs: true,
      reduce: false,
      descending: true
    })).pipe(
      map((result) => result.map((row) => row.doc))
    );
  }

  private queryGameLogStats(options: {
    mode: string,
    startDate?: Date,
    endDate?: Date,
    reduce?: boolean,
    include_docs?: boolean,
    descending?: boolean
  }) {
    // https://www.slideshare.net/okurow/couchdb-mapreduce-13321353
    // ?group_level=1 -> gruppiert nach modus
    // ?group_level=2 -> gruppiert nach modus und tag (alternativ: ?group=true)
    // ? -> gesamt, ueber alle modi und alle tage reduziert
    // ?startkey=["guess", "2018-05-20"]&endkey=["guess", "2018-05-20\uffff"] -> zwischen angegeben bereichen
    const startkey: [string, Date | string] = options.startDate
      ? [options.mode, options.startDate]
      : [options.mode, undefined];
    const endkey: [string, Date | string] = options.endDate
      ? [options.mode, options.endDate]
      : options.startDate
        ? [options.mode, `${options.startDate.toISOString}\uffff`]
        : [options.mode, `\uffff`];
    return this.gameLogDatabase.executeQuery<
      [string, Date | string],
      { durationInMillis: number, countCorrect: number, countWrong: number, countTotal: number },
      { durationInMillis: number, countCorrect: number, countWrong: number, countTotal: number }
      >({
        designDocument: 'game-log-stats',
        viewName: 'totals',
        mapFunction(emit) {
          return function (doc) {
            function normalizeDate(d: Date) {
              return new Date(d.getTime()
                - (d.getUTCHours() * 60 * 60 * 1000)
                - (d.getUTCMinutes() * 60 * 1000)
                - (d.getUTCSeconds() * 1000)
                - (d.getUTCMilliseconds()));
            }

            if (doc._id.substr(0, 'game-log_'.length) === 'game-log_') {
              emit(
                [
                  doc.mode,
                  normalizeDate(new Date(doc.startTime))
                ], {
                  durationInMillis: doc.durationInMillis,
                  countCorrect: doc.countCorrect,
                  countWrong: doc.countWrong,
                  countTotal: doc.countTotal
                });
            }
          };
        },
        reduceFunction() {
          return function (keys, values, rereduce) {
            return {
              durationInMillis: sum(values.map(function (value) {
                return value.durationInMillis;
              })),
              countCorrect: sum(values.map(function (value) {
                return value.countCorrect;
              })),
              countWrong: sum(values.map(function (value) {
                return value.countWrong;
              })),
              countTotal: sum(values.map(function (value) {
                return value.countTotal;
              }))
            };
          };
        },
        group_level: 1,
        startkey: options.descending ? endkey : startkey,
        endkey: options.descending ? startkey : endkey,
        reduce: options.reduce,
        include_docs: options.include_docs,
        descending: options.descending
      }).pipe(
        map((result) => result.rows)
      );
  }

  public queryWordsPerLevel(options: {
    mode: string
  }) {
    return zip(this.queryAllGameModes(), this.queryAllLanguages()).pipe(
      switchMap(([modes, langs]) => this.wordEntityDatabase.executeQuery<
        [string, string, number],
        number
        >({
          designDocument: 'word-stats',
          viewName: 'words-per-level',
          mapFunction(emit) {
            return `function (doc) {
              if (doc._id.substr(0, 'word_'.length) === 'word_') {
                const modes = ${JSON.stringify(modes)};
                const langs = ${JSON.stringify(langs)};
                doc.texts.forEach(function (text) {
                  langs.forEach(function (lang) {
                    modes.forEach(function (mode) {
                      emit([mode, lang, (text && text.words && text.words[lang] && text.words[lang].games
                        && text.words[lang].games[mode] && text.words[lang].games[mode].level) || 0], 1);
                    });
                  });
                });
              }
            }`;
          },
          reduceFunction() {
            return function (keys, values, rereduce) {
              if (rereduce) {
                return sum(values);
              } else {
                return values.length;
              }
            };
          },
          group: true,
          startkey: [options.mode, undefined, undefined],
          endkey: [options.mode, `\uffff`, Number.MAX_VALUE]
        }))
    );
  }

  public queryAllGameModes(): Observable<string[]> {
    return this.wordEntityDatabase.executeQuery<string, undefined, number>({
      designDocument: 'game-modes',
      viewName: 'all',
      mapFunction(emit) {
        return function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.filter(function (text) {
              return text && text.words;
            }).forEach(function (text) {
              Object.keys(text.words).filter(function (lang) {
                return text.words[lang] && text.words[lang].games;
              }).forEach(function (lang) {
                Object.keys(text.words[lang].games).forEach(function (mode) {
                  emit(mode);
                });
              });
            });
          }
        };
      },
      reduceFunction() {
        return function (keys, values, rereduce) {
          return rereduce ? sum(values) : values.length;
        };
      },
      group: true
    }).pipe(
      map((result) => result.rows.map((row) => row.key))
    );
  }

  public queryAllLanguages(): Observable<string[]> {
    return this.wordEntityDatabase.executeQuery<string, undefined, number>({
      designDocument: 'languages',
      viewName: 'all',
      mapFunction(emit) {
        return function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.filter(function (text) {
              return text && text.words;
            }).forEach(function (text) {
              Object.keys(text.words).forEach(function (lang) {
                emit(lang);
              });
            });
          }
        };
      },
      reduceFunction() {
        return function (keys, values, rereduce) {
          return rereduce ? sum(values) : values.length;
        };
      },
      group: true
    }).pipe(
      map((result) => result.rows.map((row) => row.key))
    );
  }
}
