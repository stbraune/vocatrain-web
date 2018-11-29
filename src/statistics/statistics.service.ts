import { Injectable } from '@angular/core';
import { Database, GameLogEntity, GameLogEntityService } from '../shared';
import { WordEntityService, WordEntity } from '../shared';

import { Observable, pipe, zip, of, ReplaySubject, forkJoin } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

declare const sum: any;

@Injectable()
export class StatisticsService {
  private wordEntityDatabase: Database<WordEntity>;
  private gameLogDatabase: Database<GameLogEntity>;

  private _languages: ReplaySubject<string[]>;
  private _modes: ReplaySubject<string[]>;

  public constructor(
    private wordEntityService: WordEntityService,
    private gameLogEntityService: GameLogEntityService
  ) {
    this.wordEntityDatabase = this.wordEntityService.getDatabase();
    this.gameLogDatabase = this.gameLogEntityService.getDatabase();
  }

  public countWords(): Observable<number> {
    return this.wordEntityDatabase.executeQuery<[string, number], number, number>({
      designDocument: 'counts',
      viewName: 'words',
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.forEach(function (text, index) {
              if (text.tags.indexOf('ignore') === -1 && text.tags.indexOf('text') === -1) {
                emit([doc._id, index]);
              }
            });
          }
        }`;
      },
      reduceFunction: () => '_count',
      reduce: true
    }).pipe(
      map((result) => result.rows[0].value)
    );
  }

  public countDialogTexts(): Observable<number> {
    return this.wordEntityDatabase.executeQuery<string, number, number>({
      designDocument: 'counts',
      viewName: 'dialog-texts',
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            if (doc.texts.every(function (text) {
              return text.tags && text.tags.indexOf('text') !== -1;
            })) {
              emit(doc._id);
            }
          }
        }`;
      },
      reduceFunction: () => '_count',
      reduce: true
    }).pipe(
      map((result) => result.rows[0].value)
    );
  }

  public countWordsByTag(): Observable<{ tag: string, amount: number }[]> {
    return this.wordEntityDatabase.executeQuery<string, number, number>({
      designDocument: 'counts',
      viewName: 'by-tags',
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.forEach(function (text) {
              text.tags.forEach(function (tag) {
                emit(tag);
              });
            });
          }
        }`;
      },
      reduceFunction: () => '_count',
      reduce: true,
      group: true
    }).pipe(
      map((result) => result.rows.map((row) => ({
        tag: row.key,
        amount: row.value
      })))
    );
  }

  public getTotals(options: {
    mode: string,
    startDate?: Date,
    endDate?: Date
  }) {
    return this.queryGameLogStats(Object.assign(options, {
      group_level: 1
    }));
  }

  public getTotalsPerDay(options: {
    mode: string,
    startDate: Date,
    endDate: Date
  }) {
    return this.queryGameLogStats(Object.assign(options, {
      group_level: 2
    })).pipe(
      map((result) => {
        const minDate = new Date(options.startDate);
        const maxDate = new Date(options.endDate);
        const anyKey = result[0];
        if (!anyKey) {
          return result;
        }

        const filledResult = [];
        while (minDate.getTime() <= maxDate.getTime()) {
          const index = result.findIndex((r) => r.key[1] === minDate.toISOString());
          if (index === -1) {
            filledResult.push({
              key: [options.mode, minDate.toISOString()],
              value: {
                durationInMillis: 0,
                countCorrect: 0,
                countWrong: 0,
                countTotal: 0
              }
            });
          } else {
            filledResult.push(result[index]);
          }

          minDate.setUTCDate(minDate.getUTCDate() + 1);
        }
        return filledResult;
      })
    );
  }

  public getGameLogEntities(options: {
    mode: string,
    startDate?: Date,
    endDate?: Date
  }) {
    return this.queryGameLogStats(Object.assign(options, {
      include_docs: true,
      reduce: false,
      descending: true,
      group_level: 1
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
    descending?: boolean,
    group_level: number
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
          return `function (doc) {
            function normalizeDate(d) {
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
          }`;
        },
        reduceFunction() {
          return `function (keys, values, rereduce) {
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
          }`;
        },
        group_level: options.group_level,
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
    return forkJoin(this.queryAllGameModes(), this.queryAllLanguages()).pipe(
      switchMap(([modes, langs]) => this.wordEntityDatabase.executeQuery<
        [string, number],
        number,
        number
        >({
          designDocument: 'word-stats',
          viewName: `words-per-level-${options.mode}`,
          mapFunction(emit) {
            return `function (doc) {
              if (doc._id.substr(0, 'word_'.length) === 'word_') {
                const mode = '${options.mode}';
                const langs = ${JSON.stringify(langs.sort())};
                doc.texts.forEach(function (text) {
                  langs.forEach(function (lang) {
                    const level = text
                      && text.words
                      && text.words[lang]
                      && text.words[lang].games
                      && text.words[lang].games[mode]
                      && text.words[lang].games[mode].level;
                    if (level !== undefined) {
                      emit([lang, level]);
                    }
                  });
                });
              }
            }`;
          },
          reduceFunction: () => '_count',
          group: true
        })),
      map((result) => {
        const langs = result.rows.map((row) => row.key[0])
          .reduce((prev, cur) => prev.findIndex((x) => x === cur) === -1 ? [...prev, cur] : prev, <string[]>[]);
        const groups = langs.map((lang) => ({
          key: lang,
          rows: result.rows.filter((row) => row.key[0] === lang)
        }));
        groups.forEach((group) => {
          const minLevel = group.rows.map((row) => row.key[1]).reduce((prev, cur) => prev === -1 || prev > cur ? cur : prev, -1);
          const maxLevel = group.rows.map((row) => row.key[1]).reduce((prev, cur) => prev === -1 || prev < cur ? cur : prev, -1);
          for (let level = minLevel; level <= maxLevel; level++) {
            const row = group.rows.find((r) => r.key[0] === group.key && r.key[1] === level);
            if (!row) {
              const index = result.rows.findIndex((r) => r.key[0] === group.key && r.key[1] === level - 1);
              if (index === -1) {
                result.rows.push({
                  key: [group.key, level],
                  value: 0
                });
              } else {
                result.rows.splice(index + 1, 0, {
                  key: [group.key, level],
                  value: 0
                });
              }
            }
          }
        });
        return result;
      })
    );
  }

  public queryAllGameModes(): Observable<string[]> {
    if (this._modes) {
      return this._modes;
    }

    this._modes = new ReplaySubject<string[]>(1);
    return this.wordEntityDatabase.executeQuery<string, undefined, number>({
      designDocument: 'game-modes',
      viewName: 'all',
      mapFunction(emit) {
        return `function (doc) {
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
        }`;
      },
      reduceFunction: () => '_count',
      group: true
    }).pipe(
      map((result) => result.rows.map((row) => row.key)),
      tap((result) => {
        this._modes.next(result);
        this._modes.complete();
      }),
      switchMap(() => this._modes)
    );
  }

  public queryAllLanguages(): Observable<string[]> {
    if (this._languages) {
      return this._languages;
    }

    this._languages = new ReplaySubject<string[]>(1);
    return this.wordEntityDatabase.executeQuery<string, undefined, number>({
      designDocument: 'languages',
      viewName: 'all',
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.filter(function (text) {
              return text && text.words;
            }).forEach(function (text) {
              Object.keys(text.words).forEach(function (lang) {
                emit(lang);
              });
            });
          }
        }`;
      },
      reduceFunction: () => '_count',
      group: true
    }).pipe(
      map((result) => result.rows.map((row) => row.key)),
      tap((result) => {
        this._languages.next(result);
        this._languages.complete();
      }),
      switchMap(() => this._languages)
    );
  }
}
