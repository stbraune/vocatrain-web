import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Observable';

import { DatabaseService } from './database.service';
import { Database } from './database';

import { WordEntity } from '../model';

@Injectable()
export class WordEntityService {
  private db: Database<WordEntity>;

  public constructor(
    private databaseService: DatabaseService
  ) {
    this.db = this.databaseService.openDatabase('word');
  }

  public getWordEntities(): Observable<WordEntity[]> {
    return this.db.getEntities();
  }

  public postWordEntity(wordEntity: WordEntity): Observable<WordEntity> {
    return this.db.postEntity(wordEntity, wordEntity._id);
  }

  public deleteWordEntity(wordEntity: WordEntity): Observable<boolean> {
    return this.db.removeEntity(wordEntity);
  }
}
