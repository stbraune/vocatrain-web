
import { EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, from, of, throwError } from 'rxjs';
import { tap, map, switchMap, catchError } from 'rxjs/operators';

import * as uuidv4 from 'uuid/v4';

import { DatabaseOptions } from './database-options';

import { DatabaseEntity } from './database-entity';
import { DatabaseDesignDocument } from './database-design-document';

import { DatabaseGetQueryOptions } from './database-get-query-options';
import { DatabaseRunQueryOptions } from './database-run-query-options';
import { DatabaseExecuteQueryOptions } from './database-execute-query-options';
import { DatabaseQueryResult } from './database-query-result';

import { DatabaseGetFulltextQueryOptions } from './database-get-fulltext-query-options';
import { DatabaseRunFulltextQueryOptions } from './database-run-fulltext-query-options';
import { DatabaseExecuteFulltextQueryOptions } from './database-execute-fulltext-query-options';
import { DatabaseFulltextQueryResult } from './database-fulltext-query-result';

import { any, sanitize } from './utils';

export class Database<TEntity extends DatabaseEntity> {
  public entitySaved = new EventEmitter<TEntity>();
  public entityRemoved = new EventEmitter<TEntity>();

  public constructor(
    private _database: any,
    private _options: DatabaseOptions<TEntity>,
    private _httpClient: HttpClient
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

  public getEntities(options?: any): Observable<TEntity[]> {
    const defaultEndkey = options && options.descending ? '' : '\uffff';
    const defaultStartkey = options && options.descending ? '\uffff' : '';
    return from(this._database.allDocs({
      include_docs: true,
      startkey: `${options && options.raw ? '' : this.getPrefix()}${options && options.startkey ? options.startkey : defaultStartkey}`,
      endkey: `${options && options.raw ? '' : this.getPrefix()}${options && options.endkey ? options.endkey : defaultEndkey}`,
      descending: options && options.descending,
      limit: options && options.limit
    })).pipe(map((documents: any) => {
      return documents.rows.map((row) => row.doc).map((item) => this.deserializeEntity(item));
    }));
  }

  public getEntityById(id: string): Observable<TEntity> {
    const observable: Observable<TEntity> = from(this._database.get(id));
    if (this._options.deserialize) {
      return observable.pipe(map((item: TEntity) => this.deserializeEntity(item)));
    }

    return observable;
  }

  public postEntity(item: TEntity, id?: string): Observable<TEntity> {
    const now = new Date();
    const transient = item.transient;
    item._id = `${this._options.name}_${id || now.toJSON()}`;
    item.transient = undefined;
    item.updatedAt = item.createdAt = now;

    return from(this._database.put(this.serializeEntity(item))).pipe(map((result: any) => {
      if (result.ok) {
        item._rev = result.rev;
        item.transient = transient;
        this.entitySaved.emit(item);
        return item;
      } else {
        throw new Error(`Error while creating entity: ${JSON.stringify(item)}`);
      }
    }));
  }

  public putEntity(item: TEntity, id?: string): Observable<TEntity> {
    const now = new Date();
    const transient = item.transient;
    item._id = item._id || `${this._options.name}_${id || now.toJSON()}`;
    item.transient = undefined;
    item.updatedAt = now;
    item.createdAt = item.createdAt || item.updatedAt;

    return from(this._database.put(this.serializeEntity(item))).pipe(map((result: any) => {
      if (result.ok) {
        item._rev = result.rev;
        item.transient = transient;
        this.entitySaved.emit(item);
        return item;
      } else {
        throw new Error(`Error while updating entity ${item._id}: ${JSON.stringify(item)}`);
      }
    }));
  }

  public removeEntity(item: TEntity): Observable<boolean> {
    return from(this._database.remove(item)).pipe(map((result: any) => {
      this.entityRemoved.emit(item);
      return result.ok;
    }));
  }

  private deserializeEntity(item: TEntity): TEntity {
    if (!item) {
      return item;
    }

    item.createdAt = new Date(item.createdAt);
    item.updatedAt = new Date(item.updatedAt);
    return this._options.deserialize ? this._options.deserialize(item) : item;
  }

  private serializeEntity(item: TEntity): TEntity {
    if (!item) {
      return item;
    }

    return this._options.serialize ? this._options.serialize(item) : item;
  }

  public executeQuery<TKey, TValue = {}, TReduce = {}>(
    options: DatabaseExecuteQueryOptions<TEntity, TKey, TValue, TReduce>
  ): Observable<DatabaseQueryResult<TEntity, TKey, TValue>> {
    return this.getQuery(options).pipe(
      switchMap((designDocument) => this.runQuery(options))
    );
  }

  public getQuery<TKey, TValue = {}, TReduce = {}>(
    options: DatabaseGetQueryOptions<TEntity, TKey, TValue, TReduce>
  ): Observable<DatabaseDesignDocument> {
    const mapFunction = typeof options.mapFunction === 'function' ? options.mapFunction.toString() : options.mapFunction;
    const reduceFunction = typeof options.reduceFunction === 'function' ? options.reduceFunction.toString() : options.reduceFunction;
    return this.getDesignDocument(options.designDocument).pipe(
      switchMap((designDocument) => any(
        {
          if: () => !designDocument.views,
          then: () => designDocument.views = {}
        },
        {
          if: () => !designDocument.views[options.viewName],
          then: () => designDocument.views[options.viewName] = {}
        },
        {
          if: () => designDocument.views[options.viewName].map !== mapFunction && mapFunction !== undefined,
          then: () => designDocument.views[options.viewName].map = mapFunction
        },
        {
          if: () => designDocument.views[options.viewName].reduce !== reduceFunction && reduceFunction !== undefined,
          then: () => designDocument.views[options.viewName].reduce = reduceFunction
        }
      ) ? from(this._database.put(designDocument)) : of(designDocument))
    );
  }

  public runQuery<TKey, TValue = {}, TReduce = {}>(
    options: DatabaseRunQueryOptions<TKey>
  ): Observable<DatabaseQueryResult<TEntity, TKey, TValue>> {
    return from(this._database.query(`${options.designDocument}/${options.viewName}`,
      sanitize(options, 'designDocument', 'viewName'))).pipe(
        map((result: DatabaseQueryResult<TEntity, TKey, TValue>) => options.include_docs
          ? Object.assign(result, {
            rows: result.rows.map((row) => Object.assign(row, {
              doc: this.deserializeEntity(row.doc)
            }))
          })
          : result)
      );
  }

  public executeFulltextQuery(
    options: DatabaseExecuteFulltextQueryOptions<TEntity>
  ): Observable<DatabaseFulltextQueryResult<TEntity>> {
    return this.getFulltextQuery(options).pipe(
      switchMap((designDocument) => this.runFulltextQuery(<DatabaseGetFulltextQueryOptions<TEntity>>sanitize(options, 'indexFunction')))
    );
  }

  public getFulltextQuery(
    options: DatabaseGetFulltextQueryOptions<TEntity>
  ): Observable<DatabaseDesignDocument> {
    if (!this._options.couchLuceneUrl) {
      return throwError(`Connection to couchdb-lucene not configured`);
    }

    const indexFunction = typeof options.indexFunction === 'function' ? options.indexFunction.toString() : options.indexFunction;
    return this.getDesignDocument(options.designDocument).pipe(
      switchMap((designDocument) => any(
        {
          if: () => !designDocument.fulltext,
          then: () => designDocument.fulltext = {}
        },
        {
          if: () => !designDocument.fulltext[options.indexName],
          then: () => designDocument.fulltext[options.indexName] = {}
        },
        {
          if: () => designDocument.fulltext[options.indexName].index !== indexFunction && indexFunction !== undefined,
          then: () => designDocument.fulltext[options.indexName].index = indexFunction
        }
      ) ? from(this._database.put(designDocument)) : of(designDocument))
    );
  }

  public runFulltextQuery(
    options: DatabaseRunFulltextQueryOptions
  ): Observable<DatabaseFulltextQueryResult<TEntity>> {
    if (!this._options.couchLuceneUrl) {
      return throwError(`Connection to couchdb-lucene not configured`);
    }

    const sanitized = sanitize(options, 'designDocument', 'indexName');
    const params = Object.keys(sanitized).map((key) => ({ [key]: '' + sanitized[key] }))
      .reduce((prev, cur) => Object.assign(prev, cur), {});
    return this._httpClient.get<any>(`${this._options.couchLuceneUrl}/_design/${options.designDocument}/${options.indexName}`, {
      params
    }).pipe(
      map((result: DatabaseFulltextQueryResult<TEntity>) => options.include_docs && result.rows
        ? Object.assign(result, {
          rows: result.rows.map((row) => Object.assign(row, {
            doc: this.deserializeEntity(row.doc)
          }))
        })
        : result)
    );
  }

  public getDesignDocument(designDocumentName: string): Observable<DatabaseDesignDocument> {
    const id = `_design/${designDocumentName}`;
    return from(this._database.get(id)).pipe(
      catchError((error) => (error.status === 404) ? from(this._database.put({ _id: id })) : throwError(error))
    );
  }
}
