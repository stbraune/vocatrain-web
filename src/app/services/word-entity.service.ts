import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Observable';

import { DatabaseService } from './database.service';
import { Database } from './database';

import { WordEntity } from '../model';

import * as uuidv4 from 'uuid/v4';

@Injectable()
export class WordEntityService {
  private db: Database<WordEntity>;

  public constructor(
    private databaseService: DatabaseService
  ) {
    this.db = this.databaseService.openDatabase('word');
  }

  public getDatabase(): Database<WordEntity> {
    return this.db;
  }

  public getPrefix(): string {
    return this.db.getPrefix();
  }

  public getWordEntities(options: {
    startkey: string,
    limit: number,
    sort?: string,
    descending?: boolean
  }): Observable<{
    total_rows: number,
    offset: number,
    rows: Array<{
      doc: WordEntity,
      id: string,
      key: string,
      value: any
    }>
    // WordEntity[]
  }> {
    console.log(options);
    // if (options.sort) {
      return this.db.getQuery(`words-index`, `by-${options.sort}`, `function(doc) {
        if (doc._id.substr(0, 'word_'.length) === 'word_') {
          const sort = '${options.sort}';
          if (doc[sort]) {
            emit(doc[sort]);
          }

          doc.texts.forEach(function (text) {
            if (typeof text[sort] === 'string') {
              emit(text[sort]);
            }

            if (Array.isArray(text[sort])) {
              text[sort].forEach(function (value) {
                emit(value);
              });
            }

            if (text.words && text.words[sort]) {
              emit(text.words[sort].value);
            }
          });
        }
      }`).switchMap((result: any) => {
        const x = {
          startkey: options && options.descending ? `${this.getPrefix()}\uffff` : options.startkey || `${this.getPrefix()}`,
          endkey: options && options.descending ? options.startkey || `${this.getPrefix()}` : `${this.getPrefix()}\uffff`,
          limit: options.limit,
          descending: options && options.descending,
          include_docs: true
        };
        console.log(x);
        return this.db.runQueryRaw(`words-index`, `by-${options.sort}`, {
          startkey: options && options.descending ? `\uffff` : options.startkey || ``,
          endkey: options && options.descending ? options.startkey || `` : `\uffff`,
          limit: options.limit,
          descending: options && options.descending,
          include_docs: true
        });
      });
    // }

    // return this.db.getEntities({
    //   startkey: options.startkey || this.getPrefix(),
    //   limit: options.limit,
    //   raw: true
    // });
  }

  public putWordEntity(wordEntity: WordEntity): Observable<WordEntity> {
    return this.db.putEntity(wordEntity, `${new Date().toJSON()}_${uuidv4()}`);
  }

  public deleteWordEntity(wordEntity: WordEntity): Observable<boolean> {
    return this.db.removeEntity(wordEntity);
  }
}
