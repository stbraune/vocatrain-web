import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Subject, BehaviorSubject, forkJoin, of, throwError, pipe, Observable } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';

import { AppSettings } from './app-settings';
import { DatabaseSettings } from './database-settings';

@Injectable()
export class SettingsService {
  public defaultLanguage = 'en';
  public supportedLanguages = ['en', 'de', 'bg', 'ru'];

  public appSettingsChanged: BehaviorSubject<AppSettings>;
  public databaseSettingsChanged: BehaviorSubject<DatabaseSettings>;

  public constructor(
    private httpClient: HttpClient
  ) {
    const appLanguage = localStorage.getItem('settings.app-language')
      || (navigator && navigator.language && navigator.language.split('-')[0]);
    this.appSettingsChanged = new BehaviorSubject<AppSettings>({
      appLanguage: this.supportedLanguages.indexOf(appLanguage) !== -1 ? appLanguage : this.defaultLanguage,
      userLanguages: [
        { iso: 'de', enabled: true },
        { iso: 'en', enabled: true }
      ],
      backendUrl: '',
      lefthandMode: false
    });
    this.appSettingsChanged.next(this.getAppSettings());

    this.databaseSettingsChanged = new BehaviorSubject<DatabaseSettings>({
      local: {
        databaseName: 'vocatrain'
      },
      remote: {
      },
      fti: {
      }
    });
    this.databaseSettingsChanged.next(this.getDatabaseSettings());
  }

  public getAppSettings(): AppSettings {
    const appSettings = localStorage.getItem('settings.app');
    return appSettings ? JSON.parse(appSettings) : this.appSettingsChanged.getValue();
  }

  public setAppSettings(appSettings: AppSettings) {
    appSettings.appLanguage = this.supportedLanguages.indexOf(appSettings.appLanguage) !== -1
      ? appSettings.appLanguage : this.defaultLanguage;
    appSettings.userLanguages.sort((a, b) => {
      if (a.iso > b.iso) { return 1; }
      if (a.iso < b.iso) { return -1; }
      return 0;
    });
    localStorage.setItem('settings.app', JSON.stringify(appSettings));
    this.appSettingsChanged.next(appSettings);
  }

  public getDatabaseSettings(): DatabaseSettings {
    const databaseSettings = localStorage.getItem('settings.database');
    const databaseSettings1: DatabaseSettings = databaseSettings ? JSON.parse(databaseSettings) : this.databaseSettingsChanged.getValue();
    databaseSettings1.local = databaseSettings1.local || {};
    databaseSettings1.remote = databaseSettings1.remote || {};
    databaseSettings1.fti = databaseSettings1.fti || {};
    databaseSettings1.remote.enableSynchronization = databaseSettings1.remote.enableSynchronization
      && !!databaseSettings1.remote.couchDbUrl;
    return databaseSettings1;
  }

  public setDatabaseSettings(databaseSettings: DatabaseSettings): Observable<DatabaseSettings> {
    return this.validateDatabaseSettings(databaseSettings).pipe(
      tap((result) => {
        localStorage.setItem('settings.database', JSON.stringify(databaseSettings));
        this.databaseSettingsChanged.next(databaseSettings);
      }),
      map((result) => databaseSettings)
    );
  }

  public validateDatabaseSettings(databaseSettings: DatabaseSettings): Observable<boolean> {
    return forkJoin(
      databaseSettings.remote.couchDbUrl ? this.httpClient.get<any>(databaseSettings.remote.couchDbUrl).pipe(
        map((result) => result['couchdb'] && result.version >= '2.1.0'),
        switchMap((result) => result
          ? this.httpClient.get<any>(`${databaseSettings.remote.couchDbUrl}/${databaseSettings.remote.databaseName}`).pipe(
            map((result1) => !!result1),
            catchError((error) => of('unknown-database'))
          )
          : of('unsupported-version')),
        catchError((error) => of('invalid-url')),
      ) : of(true),
      databaseSettings.fti.couchDbLuceneUrl ? this.httpClient.get<any>(databaseSettings.fti.couchDbLuceneUrl).pipe(
        map((result) => result['couchdb-lucene'] && result.version >= '2.1.0-SNAPSHOT'),
        switchMap((result) => result
          ? of(true)
          : of('unsupported-version')),
        catchError((error) => of('invalid-url')),
      ) : of(true)
    ).pipe(
      switchMap((results) => results.every((result) => result === true) ? of(true) : throwError({
        remote: results[0],
        fti: results[1]
      }))
    );
  }
}
