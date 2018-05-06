import { EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';

import * as uuidv4 from 'uuid/v4';

import { Entity } from '../model';

export class Database<T extends Entity> {
  public entitySaved = new EventEmitter<T>();
  public entityRemoved = new EventEmitter<T>();

  public constructor(
    private _database: any,
    private _name: string,
    private _deserialize?: (item: T) => T,
    private _serialize?: (item: T) => T
  ) {
  }

  public getDatabase() {
    return this._database;
  }

  public getName() {
    return this._name;
  }

  public getEntities(options?: any): Observable<T[]> {
    const defaultEndkey = options && options.descending ? '' : '\uffff';
    const defaultStartkey = options && options.descending ? '\uffff' : '';
    return Observable.fromPromise(this._database.allDocs({
      include_docs: true,
      startkey: `${this._name}_${options && options.startkey ? options.startkey : defaultStartkey}`,
      endkey: `${this._name}_${options && options.endkey ? options.endkey : defaultEndkey}`,
      descending: options && options.descending,
      limit: options && options.limit
    })).map((documents: any) => {
      return documents.rows.map((row) => row.doc).map((item) => this.deserializeEntity(item));
    });
  }

  public getEntityById(id: string): Observable<T> {
    const observable: Observable<T> = Observable.fromPromise(this._database.get(id));
    if (this._deserialize) {
      return observable.map((item: T) => this.deserializeEntity(item));
    }

    return observable;
  }

  public postEntity(item: T, id?: string): Observable<T> {
    const now = new Date();
    const transient = item.transient;
    item._id = `${this._name}_${id || now.toJSON()}`;
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
    item._id = item._id || `${this._name}_${id || now.toJSON()}`;
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
    return this._deserialize ? this._deserialize(item) : item;
  }

  private serializeEntity(item: T): T {
    return this._serialize ? this._serialize(item) : item;
  }

  public queryEntities(queryId: string, viewId, key, map: string | ((item: T) => void)): Observable<any> {
    return this.getQuery(queryId, viewId, map).switchMap((result: any) => {
      return this.runQuery(queryId, viewId, {
        key,
        include_docs: true
      });
    });
  }

  public getQuery(queryId: string, viewId: string, map: string | ((item: T) => void)): Observable<any> {
    const id = `_design/${queryId}`;
    const mapfn = typeof map === 'string' ? map : map.toString();
    return Observable.fromPromise(this._database.get(id))
      .switchMap((result: any) => {
        if (!result.views[viewId] || result.views[viewId].map !== mapfn) {
          result.views[viewId] = result.views[viewId] || {};
          result.views[viewId].map = mapfn;
          return this._database.put(result);
        }

        return Observable.of(result);
      })
      .catch((error) => {
        if (error.status === 404) {
          return Observable.fromPromise(this._database.put({
            _id: id,
            views: {
              [viewId]: {
                map: typeof map === 'string' ? map : map.toString()
              }
            }
          }));
        }

        throw error;
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
