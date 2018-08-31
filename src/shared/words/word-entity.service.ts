import { Injectable } from '@angular/core';

import { Observable, pipe, forkJoin } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import * as uuidv4 from 'uuid/v4';

import {
  Database, DatabaseService,
  DatabaseFetchOptions, DatabaseQueryResult,
  DatabaseRunFulltextQueryOptions, DatabaseFulltextQueryResult
} from '../database';
import { SettingsService } from '../settings';
import { WordEntity } from './word-entity';

declare const Document: any;

@Injectable()
export class WordEntityService {
  private db: Database<WordEntity>;

  public constructor(
    private databaseService: DatabaseService,
    private settingsService: SettingsService
  ) {
    this.db = this.databaseService.openDatabase({
      name: 'word',
      deserializeItem(item) {
        item.texts.forEach((text) => {
          Object.keys(text.words).forEach((lang) => {
            const word = text.words[lang];
            if (!word.games) {
              return;
            }

            Object.keys(word.games).forEach((mode) => {
              const game = word.games[mode];
              game.date = game.date && new Date(game.date);
            });
          });
        });
        return item;
      },
      reconcileItem(conflictingItem, winningItem) {
        const winningNewer = winningItem.updatedAt.getTime() > conflictingItem.updatedAt.getTime();
        for (let textIndex = 0; textIndex < winningItem.texts.length; textIndex++) {
          const winningText = winningItem.texts[textIndex];
          const conflictingText = conflictingItem.texts[textIndex];
          winningText.meta = winningNewer ? winningText.meta : conflictingText.meta;
          winningText.tags = winningNewer ? winningText.tags : conflictingText.tags;

          Object.keys(winningText.words).forEach((lang) => {
            const winningWord = winningText.words[lang];
            const conflictingWord = conflictingText.words[lang];
            if (!conflictingWord) {
              return;
            }

            winningWord.value = winningNewer ? winningWord.value : conflictingWord.value;

            if (!winningWord.games) {
              // no game information yet in the winning word, so take everything from the conflicting word and return
              winningWord.games = conflictingWord.games;
              return;
            }

            if (!conflictingWord.games) {
              // no game information to merge from the conflicting word
              return;
            }

            // merge any game in the winning word with a maybe available one in the conflicting word
            Object.keys(winningWord.games).forEach((mode) => {
              const winningGame = winningWord.games[mode];
              const conflictingGame = conflictingWord.games[mode];
              if (!conflictingGame) {
                return;
              }

              winningGame.date = winningGame.date.getTime() > conflictingGame.date.getTime() ? winningGame.date : conflictingGame.date;
              winningGame.level = winningGame.date.getTime() > conflictingGame.date.getTime() ? winningGame.level : conflictingGame.level;
            });

            // add any game in the conflicting word, that we haven't yet in the winning word
            Object.keys(conflictingWord.games).filter((mode) => !winningWord.games[mode]).forEach((mode) => {
              winningWord.games[mode] = conflictingWord.games[mode];
            });
          });
        }
        return winningItem;
      }
    });
  }

  public getDatabase(): Database<WordEntity> {
    return this.db;
  }

  public getPrefix(): string {
    return this.db.getPrefix();
  }

  public getTags() {
    return this.db.executeQuery<{}, string, string[]>({
      designDocument: 'tags',
      viewName: 'by-name',
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.forEach(function (text) {
              text.tags.forEach(function (tag) {
                emit(undefined, tag);
              });
            });
          }
        }`;
      },
      reduceFunction() {
        return `function (keys, values, rereduce) {
          if (rereduce) {
            values = values.reduce(function (prev, cur) {
              return prev.concat(cur);
            }, []);
          }

          return values.reduce(function (prev, cur) {
            if (prev.indexOf(cur) === -1) {
              prev.push(cur);
            }
            return prev;
          }, []);
        }`;
      }
    }).pipe(
      map((result) => result.rows.map((row) => row.value as string[])),
      map((result) => result[0] || [])
    );
  }

  public getWordEntities(options: {
    query?: string,
    startkey: string | number,
    limit: number,
    sort?: string,
    descending?: boolean
  }): Observable<DatabaseFulltextQueryResult<WordEntity> | DatabaseQueryResult<WordEntity, string, {}>> {
    if (options.query) {
      return this.searchWordEntities({
        q: options.query,
        skip: <number>options.startkey || 0,
        limit: options.limit,
        include_docs: true
      });
    }

    return this.db.executeQuery<string>({
      designDocument: `words-index`,
      viewName: `by-${options.sort}`,
      mapFunction(emit) {
        return `function(doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            const sort = '${options.sort}';
            if (doc[sort]) {
              emit(doc[sort]);
            }

            if (sort === 'creation') {
              emit([doc.createdAt, doc._id]);
            }

            doc.texts.forEach(function (text) {
              if (typeof text[sort] === 'string') {
                emit([text[sort], doc._id]);
              }

              if (Array.isArray(text[sort])) {
                text[sort].sort();
                emit([text[sort], doc._id]);
              }

              if (text.words && text.words[sort]) {
                emit([text.words[sort].value, doc._id]);
              }
            });
          }
        }`;
      },
      startkey: options && options.descending ? (<string>options.startkey || undefined) : (<string>options.startkey || ``),
      endkey: options && options.descending ? '' : undefined,
      limit: options.limit,
      descending: options && options.descending,
      include_docs: true
    });
  }

  public getDuplicateWordEntities(options: Partial<DatabaseFetchOptions<[string, string]>>) {
    return this.getDuplicateWordEntitiesInternal(Object.assign({}, options, {
      group: true,
      limit: undefined
    })).pipe(
      map((result) => result.rows.filter((row) => row.value > 1)),
      map((rows) => rows.map((row) => row.key)),
      switchMap((keys) => this.getDuplicateWordEntitiesInternal(Object.assign({}, options, {
        reduce: false,
        keys: keys,
        startkey: undefined,
        endkey: undefined,
        include_docs: true
      })))
    );
  }

  private getDuplicateWordEntitiesInternal(options: Partial<DatabaseFetchOptions<[string, string]>>) {
    return this.db.executeQuery<[string, string], {}, number>(Object.assign({
      designDocument: 'words-index',
      viewName: 'by-lang',
      mapFunction(emit) {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            doc.texts.forEach(function (text) {
              if (text.tags.indexOf('text') !== -1) {
                return;
              }

              if (text.tags.indexOf('nodup') !== -1) {
                return;
              }

              Object.keys(text.words).forEach(function (lang) {
                emit([lang, text.words[lang].value]);
              });
            });
          }
        }`;
      },
      reduceFunction() {
        return '_count';
      }
    }, options));
  }

  public getWordEntitiesFields(): Observable<string[]> {
    return this.searchWordEntities().pipe(
      map((result) => result.fields.reduce((prev, cur) => prev.indexOf(cur) === -1 ? [...prev, cur] : prev, []))
    );
  }

  public searchWordEntities(options?: Partial<DatabaseRunFulltextQueryOptions>) {
    const supportedLanguages = this.settingsService.getAppSettings().userLanguages.map((userLanguage) => userLanguage.iso);
    return this.db.executeFulltextQuery(Object.assign({
      designDocument: 'words-index',
      indexName: 'fti',
      indexFunction() {
        return `function (doc) {
          if (doc._id.substr(0, 'word_'.length) === 'word_') {
            const supportedLanguages = ${JSON.stringify(supportedLanguages)};
            const indexDocument = new Document();
            doc.texts.forEach(function (text) {
              indexDocument.add(text.meta);
              indexDocument.add(text.meta, { field: 'meta' });

              text.tags.forEach(function(tag) {
                indexDocument.add(tag);
                indexDocument.add(tag, { field: 'tags' });
              });
              supportedLanguages.forEach(function (lang) {
                if (text.words[lang] && text.words[lang].value) {
                  indexDocument.add(text.words[lang].value);
                  indexDocument.add(text.words[lang].value, { field: lang });
                }
              });
            });
            return indexDocument;
          }
        }`;
      }
    }, options));
  }

  public putWordEntity(wordEntity: WordEntity): Observable<WordEntity> {
    return this.db.putEntity(wordEntity, `${new Date().toJSON()}_${uuidv4()}`);
  }

  public deleteWordEntity(wordEntity: WordEntity): Observable<WordEntity> {
    return this.db.removeEntity(wordEntity);
  }
}
