import { EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';

import * as uuidv4 from 'uuid/v4';

import * as rp from 'request-promise-native';

import { DatabaseOptions } from './database-options';
import { Entity } from '../model';

export class Database<T extends Entity> {
  public entitySaved = new EventEmitter<T>();
  public entityRemoved = new EventEmitter<T>();

  public constructor(
    private _database: any,
    private _options: DatabaseOptions<T>
  ) {
  }

  public getDatabase() {
    return this._database;
  }

  public getName() {
    return this._options.name;
  }

  public getPrefix(): string {
    return `${this._options.name}_`;
  }

  public getEntities(options?: any): Observable<T[]> {
    const defaultEndkey = options && options.descending ? '' : '\uffff';
    const defaultStartkey = options && options.descending ? '\uffff' : '';
    return Observable.fromPromise(this._database.allDocs({
      include_docs: true,
      startkey: `${options && options.raw ? '' : this.getPrefix()}${options && options.startkey ? options.startkey : defaultStartkey}`,
      endkey: `${options && options.raw ? '' : this.getPrefix()}${options && options.endkey ? options.endkey : defaultEndkey}`,
      descending: options && options.descending,
      limit: options && options.limit
    })).map((documents: any) => {
      return documents.rows.map((row) => row.doc).map((item) => this.deserializeEntity(item));
    });
  }

  public getEntityById(id: string): Observable<T> {
    const observable: Observable<T> = Observable.fromPromise(this._database.get(id));
    if (this._options.deserialize) {
      return observable.map((item: T) => this.deserializeEntity(item));
    }

    return observable;
  }

  public postEntity(item: T, id?: string): Observable<T> {
    const now = new Date();
    const transient = item.transient;
    item._id = `${this._options.name}_${id || now.toJSON()}`;
    item.transient = undefined;
    item.updatedAt = item.createdAt = now;

    return Observable.fromPromise(this._database.put(this.serializeEntity(item))).map((result: any) => {
      if (result.ok) {
        item._rev = result.rev;
        item.transient = transient;
        this.entitySaved.emit(item);
        return item;
      } else {
        throw new Error(`Error while creating entity: ${JSON.stringify(item)}`);
      }
    });
  }

  public putEntity(item: T, id?: string): Observable<T> {
    const now = new Date();
    const transient = item.transient;
    item._id = item._id || `${this._options.name}_${id || now.toJSON()}`;
    item.transient = undefined;
    item.updatedAt = now;
    item.createdAt = item.createdAt || item.updatedAt;

    return Observable.fromPromise(this._database.put(this.serializeEntity(item))).map((result: any) => {
      if (result.ok) {
        item._rev = result.rev;
        item.transient = transient;
        this.entitySaved.emit(item);
        return item;
      } else {
        throw new Error(`Error while updating entity ${item._id}: ${JSON.stringify(item)}`);
      }
    });
  }

  public removeEntity(item: T): Observable<boolean> {
    return Observable.fromPromise(this._database.remove(item)).map((result: any) => {
      this.entityRemoved.emit(item);
      return result.ok;
    });
  }

  private deserializeEntity(item: T): T {
    item.createdAt = new Date(item.createdAt);
    item.updatedAt = new Date(item.updatedAt);
    return this._options.deserialize ? this._options.deserialize(item) : item;
  }

  private serializeEntity(item: T): T {
    return this._options.serialize ? this._options.serialize(item) : item;
  }

  public queryEntities(queryId: string, viewId, key, map: string | ((item: T) => void)): Observable<any> {
    return this.getQuery(queryId, viewId, map).switchMap((result: any) => {
      return this.runQuery(queryId, viewId, {
        key,
        include_docs: true
      });
    });
  }

  public getFulltextQuery(designDocumentName: string, indexName: string, indexFunction: string | ((item: T) => any)) {
    const indexFunctionString = typeof indexFunction === 'string' ? indexFunction : indexFunction.toString();
    return this.getDesignDocument(designDocumentName).switchMap((designDocument) => {
      let changed = false;
      if (!designDocument.fulltext) {
        designDocument.fulltext = {};
        changed = true;
      }

      if (!designDocument.fulltext[indexName]) {
        designDocument.fulltext[indexName] = {
          index: indexFunctionString
        };
        changed = true;
      }

      if (designDocument.fulltext[indexName].index !== indexFunctionString) {
        designDocument.fulltext[indexName].index = indexFunctionString;
        changed = true;
      }

      if (changed) {
        return this._database.put(designDocument);
      }

      return Observable.of(designDocument);
    });
  }

  public executeFulltextQuery(designDocumentName: string, indexName: string, options: any): Observable<{
    q: string,
    fetch_duration: number,
    total_rows: number,
    limit: number,
    search_duration: number,
    etag: string,
    skip: number,
    rows: Array<{
      score: number,
      id: string,
      doc?: T
    }>
  }> {
    if (!this._options.couchLuceneUrl) {
      return Observable.throw(`Connection to couchdb-lucene not configured`);
    }

    return Observable.fromPromise(rp.get({
      uri: `${this._options.couchLuceneUrl}/${this._database.name}/_design/${designDocumentName}/${indexName}`,
      qs: options,
      json: true
    }));
  }

  public getQuery(designDocumentName: string, viewId: string, map: string | ((item: T) => void)): Observable<any> {
    const mapfn = typeof map === 'string' ? map : map.toString();
    return this.getDesignDocument(designDocumentName).switchMap((designDocument) => {
      let changed = false;
      if (!designDocument.views) {
        designDocument.views = {};
        changed = true;
      }

      if (!designDocument.views[viewId]) {
        designDocument.views[viewId] = {
          map: mapfn
        };
        changed = true;
      }

      if (designDocument.views[viewId].map !== mapfn) {
        designDocument.views[viewId].map = mapfn;
        changed = true;
      }

      if (changed) {
        return this._database.put(designDocument);
      }

      return Observable.of(designDocument);
    });
  }

  public getDesignDocument(designDocumentName: string): Observable<any> {
    const id = `_design/${designDocumentName}`;
    return Observable.fromPromise(this._database.get(id))
      .catch((error) => {
        if (error.status === 404) {
          return Observable.fromPromise(this._database.put({
            _id: id
          }));
        }
      });
  }

  public runQuery(queryId: string, viewId: string, options: any): Observable<T[]> {
    return this.runQueryRaw(queryId, viewId, options).map((result: any) => {
      return result.rows.map((row) => row.doc).map((item) => this.deserializeEntity(item));
    });
  }

  public runQueryRaw(queryId: string, viewId: string, options: any): Observable<any> {
    return Observable.fromPromise(this._database.query(queryId + '/' + viewId, options));
  }
}
