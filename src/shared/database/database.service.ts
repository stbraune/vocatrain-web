import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, BehaviorSubject } from 'rxjs';

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

import { DatabaseEntity } from './database-entity';
import { Database } from './database';
import { DatabaseOptions } from './database-options';
import { SettingsService, DatabaseSettings } from '../settings';

@Injectable()
export class DatabaseService {
  private _settings: DatabaseSettings;

  private _local: any;
  private _remote: any;
  private _sync: any;

  public synchronizationSubject = new Subject<{
    type: 'change' | 'paused' | 'active' | 'complete' | 'error',
    change?: any,
    info?: any,
    error?: any
  }>();

  public databaseOpened = new Subject<Database<DatabaseEntity>>();

  private databaseSubject = new BehaviorSubject<any>(undefined);

  public constructor(
    private httpClient: HttpClient,
    private settingsService: SettingsService
  ) {
    this.settingsService.databaseSettingsChanged.subscribe((databaseSettings) => {
      this._settings = databaseSettings;
    });
  }

  public openDatabase<T extends DatabaseEntity>(options: DatabaseOptions<T>): Database<T> {
    // for going directly onto couchdb-lucene instance
    // options.couchLuceneUrl = options.couchLuceneUrl || 'http://localhost:5985/local';
    // for using the couchdb proxy handler
    if (this.databaseSubject.getValue() === undefined) {
      this.databaseSubject.next(this.getRemoteDatabase());
    }

    options.couchLuceneUrl = options.couchLuceneUrl || `${this._settings.fti.couchDbLuceneUrl}/${this._settings.fti.databaseName}`;
    options.debugging = true;
    const database = new Database<T>(this.databaseSubject, options, this.httpClient);
    this.databaseOpened.next(database);
    return database;
  }

  private getLocalDatabase(): any {
    return this._local = this._local || new PouchDB(this._settings.local.databaseName, {
      adapter: 'idb'
    });
  }

  private getRemoteDatabase(): any {
    return this._remote = this._remote || (
      this._settings.remote && new PouchDB(`${this._settings.remote.couchDbUrl}/${this._settings.remote.databaseName}`)
    );
  }

  public isSyncing() {
    return !!this._sync;
  }

  public enableSyncing(): Observable<any> {
    if (this._sync) {
      return;
    }

    if (!this._settings.remote.enableSynchronization) {
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
      this.databaseSubject.next(this.getRemoteDatabase());
      this.synchronizationSubject.next({
        type: 'change',
        change: change
      });
    }).on('paused', (info) => {
      this.databaseSubject.next(this.getRemoteDatabase());
      this.synchronizationSubject.next({
        type: 'paused',
        info: info
      });
    }).on('active', (info) => {
      this.databaseSubject.next(this.getRemoteDatabase());
      this.synchronizationSubject.next({
        type: 'active',
        info: info
      });
    }).on('complete', (info) => {
      this.databaseSubject.next(this.getRemoteDatabase());
      this.synchronizationSubject.next({
        type: 'complete',
        info: info
      });
    }).on('error', (error) => {
      this.databaseSubject.next(this.getLocalDatabase());
      this.synchronizationSubject.next({
        type: 'error',
        error: error
      });
    });

    return this.synchronizationSubject;
  }

  public disableSyncing(): Observable<any> {
    if (this._sync) {
      this.databaseSubject.next(this.getLocalDatabase());
      this._sync.cancel();
      this._sync = undefined;
    }

    return this.synchronizationSubject;
  }
}
