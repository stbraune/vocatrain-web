import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseSettings } from './database-settings';

@Injectable()
export class SettingsService {
  public defaultLanguage = 'en';

  public constructor(
    private translateService: TranslateService
  ) {
  }

  public getAppLanguage(): string {
    const appLanguage = localStorage.getItem('settings.app-language')
      || (navigator && navigator.language && navigator.language.split('-')[0]);
    return /(en|de|bg|ru)/gi.test(appLanguage) ? appLanguage : this.defaultLanguage;
  }

  public setAppLanguage(appLanguage: string) {
    localStorage.setItem('settings.app-language', appLanguage);
    this.translateService.use(this.getAppLanguage());
  }

  public getLanguages(): string[] {
    const languages = localStorage.getItem('settings.languages');
    return languages ? JSON.parse(languages) : [];
  }

  public setLanguages(languages: string[]) {
    localStorage.setItem('settings.languages', JSON.stringify(languages));
  }

  public getDatabaseSettings(): DatabaseSettings {
    const databaseSettings = localStorage.getItem('settings.database');
    const databaseSettings1: DatabaseSettings = databaseSettings ? JSON.parse(databaseSettings) : {
      databaseName: 'vocatrain'
    };
    databaseSettings1.enableSynchronization = databaseSettings1.enableSynchronization && !!databaseSettings1.couchDbLuceneUrl;
    return databaseSettings1;
  }

  public setDatabaseSettings(databaseSettings: DatabaseSettings) {
    localStorage.setItem('settings.database', JSON.stringify(databaseSettings));
  }
}
