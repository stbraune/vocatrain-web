import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

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
  private _local: any;
  private _remote: any;
  private _sync: any;

  public synchronizationSubject = new Subject<any>();

  public constructor() {
  }

  public openDatabase<T extends Entity>(
    name: string,
    deserialize?: (item: T) => T,
    serialize?: (item: T) => T
  ): Database<T> {
    return new Database<T>(this.getLocalDatabase(), name, deserialize, serialize);
  }

  private getLocalDatabase(): any {
    return this._local = this._local || new PouchDB('vocatrain', {
      adapter: 'idb'
    });
  }

  private getRemoteDatabase(): any {
    return this._remote = this._remote || new PouchDB('http://localhost:5984/vocatrain');
  }

  public isSyncing() {
    return !!this._sync;
  }

  public enableSyncing(): Observable<any> {
    if (this._sync) {
      return;
    }

    this._sync = this.getLocalDatabase().sync(this.getRemoteDatabase(), {
      live: true
    });
    this._sync.on('change', (change) => {
      this.synchronizationSubject.next({
        type: 'change',
        change: change
      });
    }).on('paused', (info) => {
      this.synchronizationSubject.next({
        type: 'paused',
        info: info
      });
    }).on('active', (info) => {
      this.synchronizationSubject.next({
        type: 'active',
        info: info
      });
    }).on('complete', (info) => {
      this.synchronizationSubject.next({
        type: 'complete',
        info: info
      });
    }).on('error', (error) => {
      this.synchronizationSubject.next({
        type: 'error',
        error: error
      });
    });

    return this.synchronizationSubject;
  }

  public disableSyncing(): Observable<any> {
    if (this._sync) {
      this._sync.cancel();
      this._sync = undefined;
    }

    return this.synchronizationSubject;
  }
}
