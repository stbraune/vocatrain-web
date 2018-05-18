import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject } from 'rxjs';

import { Database } from './database';
import { DatabaseOptions } from './database-options';
import { Entity } from '../model';
import { SettingsService } from '../settings';

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

  public constructor(
    private httpClient: HttpClient,
    private settingsService: SettingsService
  ) {
  }

  public openDatabase<T extends Entity>(options: DatabaseOptions<T>): Database<T> {
    // for going directly onto couchdb-lucene instance
    // options.couchLuceneUrl = options.couchLuceneUrl || 'http://localhost:5985/local';
    // for using the couchdb proxy handler
    options.couchLuceneUrl = options.couchLuceneUrl || this.settingsService.getDatabaseSettings().couchDbLuceneUrl;
    return new Database<T>(this.getLocalDatabase(), options, this.httpClient);
  }

  private getLocalDatabase(): any {
    return this._local = this._local || new PouchDB(this.settingsService.getDatabaseSettings().databaseName, {
      adapter: 'idb'
    });
  }

  private getRemoteDatabase(): any {
    return this._remote = this._remote
      || (this.settingsService.getDatabaseSettings().couchDbUrl && new PouchDB(this.settingsService.getDatabaseSettings().couchDbUrl));
  }

  public isSyncing() {
    return !!this._sync;
  }

  public enableSyncing(): Observable<any> {
    if (this._sync) {
      return;
    }

    if (!this.settingsService.getDatabaseSettings().enableSynchronization) {
      return;
    }

    const remoteDatabase = this.getRemoteDatabase();
    if (!remoteDatabase) {
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
