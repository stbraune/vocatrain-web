import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';

import { DatabaseService } from './database.service';
import { Database } from './database';

import { WordEntity } from '../model';

import * as uuidv4 from 'uuid/v4';
import { SettingsService } from '../settings';

declare const Document: any;

@Injectable()
export class WordEntityService {
  private db: Database<WordEntity>;

  public constructor(
    private databaseService: DatabaseService,
    private settingsService: SettingsService
  ) {
    this.db = this.databaseService.openDatabase({
      name: 'word'
    });
  }

  public getDatabase(): Database<WordEntity> {
    return this.db;
  }

  public getPrefix(): string {
    return this.db.getPrefix();
  }

  public getWordEntities(options: {
    query?: string,
    startkey: any,
    limit: number,
    sort?: string,
    descending?: boolean
  }): Observable<{
    total_rows: number,
    // offset: number,
    rows: Array<{
      doc?: WordEntity,
      id: string,
      score?: number,
      key?: string,
      value?: any
    }>
  }> {
    if (options.query) {
      return this.searchWordEntities({
        q: options.query,
        skip: options.startkey,
        limit: options.limit,
        include_docs: true
      });
    }

    return this.db.getQuery(`words-index`, `by-${options.sort}`, `function(doc) {
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
    }`).switchMap((result: any) => {
        return this.db.runQueryRaw(`words-index`, `by-${options.sort}`, {
          startkey: options && options.descending ? (options.startkey || undefined) : (options.startkey || ``),
          endkey: options && options.descending ? '' : undefined,
          limit: options.limit,
          descending: options && options.descending,
          include_docs: true
        });
      });
  }

  public getWordEntitiesFields(): Observable<string[]> {
    return this.searchWordEntities({}).map((result: any) => result.fields);
  }

  private searchWordEntities(options: any) {
    const supportedLanguages = this.settingsService.getLanguages();
    return this.db.getFulltextQuery('words-index', 'fti', `function (doc) {
      if (doc._id.substr(0, 'word_'.length) === 'word_') {
        const supportedLanguages = ${JSON.stringify(supportedLanguages)};
        const indexDocument = new Document();
        indexDocument.add(doc.type.title);
        indexDocument.add(doc.type.title, { field: 'type' });
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
    }`).switchMap((designDocument) => {
      return this.db.executeFulltextQuery('words-index', 'fti', options);
    });
  }

  public putWordEntity(wordEntity: WordEntity): Observable<WordEntity> {
    return this.db.putEntity(wordEntity, `${new Date().toJSON()}_${uuidv4()}`);
  }

  public deleteWordEntity(wordEntity: WordEntity): Observable<boolean> {
    return this.db.removeEntity(wordEntity);
  }
}
