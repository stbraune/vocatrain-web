import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { Database } from './database';
import { Entity } from '../model';

import PouchDB from 'pouchdb-core';
import PouchDBAdapterIdb from 'pouchdb-adapter-idb';
import PouchDBAdapterHttp from 'pouchdb-adapter-http';
import PouchDBMapReduce from 'pouchdb-mapreduce';
import PouchDBReplication from 'pouchdb-replication';
import PouchDBFind from 'pouchdb-find';

PouchDB
  .plugin(PouchDBAdapterIdb)
  .plugin(PouchDBAdapterHttp)
  .plugin(PouchDBMapReduce)
  .plugin(PouchDBReplication)
  .plugin(PouchDBFind);

@Injectable()
export class DatabaseService {
  private _database: any;

  public constructor() {
  }

  public openDatabase<T extends Entity>(
    name: string,
    deserialize?: (item: T) => T,
    serialize?: (item: T) => T
  ): Database<T> {
    return new Database<T>(this.getDatabase(), name, deserialize, serialize);
  }

  private getDatabase(): any {
    if (this._database) {
      return this._database;
    }

    return this._database = this.initializeDatabase(new PouchDB('vocatrain', {
      adapter: 'idb'
    }));
  }

  private initializeDatabase(database: any): Observable<any> {
    return database;
  }
}
