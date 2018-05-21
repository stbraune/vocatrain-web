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
        const minDate = result.map((r) => new Date(<string>r.key[1]))
          .reduce((prev, cur) => prev.getTime() === 0 || prev.getTime() > cur.getTime() ? cur : prev, new Date(0));
        const maxDate = result.map((r) => new Date(<string>r.key[1]))
          .reduce((prev, cur) => prev.getTime() === 0 || prev.getTime() < cur.getTime() ? cur : prev, new Date(0));
        const anyKey = result[0];
        if (!anyKey) {
          return result;
        }

        while (minDate.getTime() < maxDate.getTime()) {
          if (!result.find((r) => r.key[1] === minDate.toISOString())) {
            const oneDayLess = new Date(minDate.getTime());
            oneDayLess.setDate(oneDayLess.getDate() - 1);
            const index = result.findIndex((r) => r.key[1] === oneDayLess.toISOString());
            if (index === -1) {
              result.push({
                key: [options.mode, minDate.toISOString()],
                value: {
                  durationInMillis: 0,
                  countCorrect: 0,
                  countWrong: 0,
                  countTotal: 0
                }
              });
            } else {
              result.splice(index + 1, 0, {
                key: [options.mode, minDate.toISOString()],
                value: {
                  durationInMillis: 0,
                  countCorrect: 0,
                  countWrong: 0,
                  countTotal: 0
                }
              });
            }
          }

          minDate.setDate(minDate.getDate() + 1);
        }
        return result;
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
                        && text.words[lang].games[mode] && text.words[lang].games[mode].level) || 0]);
                    });
                  });
                });
              }
            }`;
          },
          reduceFunction: () => '_count',
          group: true,
          startkey: [options.mode, undefined, undefined],
          endkey: [options.mode, `\uffff`, Number.MAX_VALUE]
        })),
      map((result) => {
        const keysWithoutLevel = result.rows.map((row) => <[string, string]>[row.key[0], row.key[1]])
          .reduce((prev, cur) => prev.findIndex((x) => x[0] === cur[0] && x[1] === cur[1]) === -1 ? [...prev, cur] : prev,
            <[string, string][]>[]);
        const groups = keysWithoutLevel.map((keyWithoutLevel) => ({
          key: keyWithoutLevel,
          rows: result.rows.filter((row) => row.key[0] === keyWithoutLevel[0] && row.key[1] === keyWithoutLevel[1])
        }));
        groups.forEach((group) => {
          const minLevel = group.rows.map((row) => row.key[2]).reduce((prev, cur) => prev === -1 || prev > cur ? cur : prev, -1);
          const maxLevel = group.rows.map((row) => row.key[2]).reduce((prev, cur) => prev === -1 || prev < cur ? cur : prev, -1);
          for (let level = minLevel; level <= maxLevel; level++) {
            const row = group.rows.find((r) => r.key[0] === group.key[0] && r.key[1] === group.key[1] && r.key[2] === level);
            if (!row) {
              const index = result.rows.findIndex((r) => r.key[0] === group.key[0] && r.key[1] === group.key[1] && r.key[2] === level - 1);
              if (index === -1) {
                result.rows.push({
                  key: [group.key[0], group.key[1], level],
                  value: 0
                });
              } else {
                result.rows.splice(index + 1, 0, {
                  key: [group.key[0], group.key[1], level],
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
      reduceFunction: () => '_count',
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
      reduceFunction: () => '_count',
      group: true
    }).pipe(
      map((result) => result.rows.map((row) => row.key))
    );
  }
}
