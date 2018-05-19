import { Injectable } from '@angular/core';

import { Subject, BehaviorSubject } from 'rxjs';

import { AppSettings } from './app-settings';
import { DatabaseSettings } from './database-settings';

@Injectable()
export class SettingsService {
  public defaultLanguage = 'en';
  public supportedLanguages = ['en', 'de', 'bg', 'ru'];

  public appSettingsChanged: BehaviorSubject<AppSettings>;
  public databaseSettingsChanged: BehaviorSubject<DatabaseSettings>;

  public constructor() {
    const appLanguage = localStorage.getItem('settings.app-language')
      || (navigator && navigator.language && navigator.language.split('-')[0]);
    this.appSettingsChanged = new BehaviorSubject<AppSettings>({
      appLanguage: this.supportedLanguages.indexOf(appLanguage) !== -1 ? appLanguage : this.defaultLanguage,
      userLanguages: [
        { iso: 'de', enabled: true },
        { iso: 'en', enabled: true }
      ],
      backendUrl: ''
    });
    this.appSettingsChanged.next(this.getAppSettings());

    this.databaseSettingsChanged = new BehaviorSubject<DatabaseSettings>({
      databaseName: 'vocatrain'
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
    databaseSettings1.enableSynchronization = databaseSettings1.enableSynchronization && !!databaseSettings1.couchDbLuceneUrl;
    return databaseSettings1;
  }

  public setDatabaseSettings(databaseSettings: DatabaseSettings) {
    localStorage.setItem('settings.database', JSON.stringify(databaseSettings));
    this.databaseSettingsChanged.next(databaseSettings);
  }
}
