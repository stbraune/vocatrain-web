import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { SettingsService } from './settings.service';
import { AppSettings } from './app-settings';
import { DatabaseSettings } from './database-settings';

@Component({
  selector: 'settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  public language: string;

  public appSettings: AppSettings;
  public databaseSettings: DatabaseSettings;
  public databaseSettingsValidation: {
    remote?: string,
    fti?: string
  } = {};

  public constructor(
    private settingsService: SettingsService,
    private translateService: TranslateService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit() {
    this.databaseSettings = this.settingsService.getDatabaseSettings();
    this.appSettings = this.settingsService.getAppSettings();
  }

  public editLanguage($event: MouseEvent, language: string) {
    this.language = language;
  }

  public deleteLanguage($event: MouseEvent, language: { iso: string, enabled: boolean }) {
    $event.stopPropagation();
    const indexOf = this.appSettings.userLanguages.indexOf(language);
    if (indexOf !== -1) {
      this.appSettings.userLanguages.splice(indexOf, 1);
    }
  }

  public onLanguageKeyUp($event: KeyboardEvent) {
    // enter
    if ($event.which === 13) {
      this.addLanguage();
    }
  }

  public addLanguage() {
    const language = this.language.trim();
    if (language && this.appSettings.userLanguages.findIndex((userLanguage) => userLanguage.iso === language) === -1) {
      this.language = '';
      this.appSettings.userLanguages.push({
        iso: language,
        enabled: true
      });
    }
  }

  public onSaveAppSettings() {
    this.settingsService.setAppSettings(this.appSettings);
    this.onSettingsSaved();
  }

  public onSaveDatabaseSettings() {
    this.settingsService.validateDatabaseSettings(this.databaseSettings).subscribe((result) => {
      this.databaseSettingsValidation = {};
      this.settingsService.setDatabaseSettings(this.databaseSettings);
      this.onSettingsSaved();
    }, (error) => {
      this.databaseSettingsValidation = error;
    });
  }

  private onSettingsSaved() {
    this.translateService.get('settings.saved').subscribe((text) => {
      this.snackBar.open(text, undefined, { duration: 3000 });
    });
  }
}
