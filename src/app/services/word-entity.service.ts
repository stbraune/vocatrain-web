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

  public getWordEntities(startkey: string, limit: number): Observable<WordEntity[]> {
    return this.db.getEntities({
      startkey: startkey || this.getPrefix(),
      limit: limit,
      raw: true
    });
  }

  public putWordEntity(wordEntity: WordEntity): Observable<WordEntity> {
    return this.db.putEntity(wordEntity, `${new Date().toJSON()}_${uuidv4()}`);
  }

  public deleteWordEntity(wordEntity: WordEntity): Observable<boolean> {
    return this.db.removeEntity(wordEntity);
  }
}
