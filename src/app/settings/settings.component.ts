import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { SettingsService } from './settings.service';
import { DatabaseSettings } from './database-settings';

@Component({
  selector: 'settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  public appLanguage: string;

  public languages: string[] = [];
  public language = '';

  public databaseSettings: DatabaseSettings;

  public constructor(
    private settingsService: SettingsService,
    private translateService: TranslateService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit() {
    this.appLanguage = this.settingsService.getAppLanguage();

    this.languages = this.settingsService.getLanguages();
    this.languages.sort();

    this.databaseSettings = this.settingsService.getDatabaseSettings();
  }

  public editLanguage($event: MouseEvent, language: string) {
    this.language = language;
  }

  public deleteLanguage($event: MouseEvent, language: string) {
    $event.stopPropagation();
    const indexOf = this.languages.indexOf(language);
    if (indexOf !== -1) {
      this.languages.splice(indexOf, 1);
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
    if (language && this.languages.indexOf(language) === -1) {
      this.language = '';
      this.languages.push(language);
      this.languages.sort();
    }
  }

  public onSaveAppSettings() {
    this.settingsService.setAppLanguage(this.appLanguage);
    this.onSettingsSaved();
  }

  public onSaveLanguageSettings() {
    this.settingsService.setLanguages(this.languages);
    this.onSettingsSaved();
  }

  public onSaveDatabaseSettings() {
    this.settingsService.setDatabaseSettings(this.databaseSettings);
    this.onSettingsSaved();
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  private onSettingsSaved() {
    this.translateService.get('settings.saved').subscribe((text) => {
      this.snackBar.open(text, undefined, { duration: 3000 });
    });
  }
}
