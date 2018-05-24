import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { Database, DatabaseService } from '../database';
import { WordTypeEntity } from './word-type-entity';

@Injectable()
export class WordTypeEntityService {
  private db: Database<WordTypeEntity>;

  public constructor(
    private databaseService: DatabaseService
  ) {
    this.db = this.databaseService.openDatabase({
      name: 'word-type'
    });
  }

  public getWordTypeEntities(): Observable<WordTypeEntity[]> {
    return this.db.getEntities();
  }

  public putWordEntity(wordTypeEntity: WordTypeEntity): Observable<WordTypeEntity> {
    return this.db.putEntity(wordTypeEntity, wordTypeEntity.title);
  }

  public deleteWordTypeEntity(wordTypeEntity: WordTypeEntity): Observable<boolean> {
    return this.db.removeEntity(wordTypeEntity);
  }
}
