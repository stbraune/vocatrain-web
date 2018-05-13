import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { DatabaseService } from './services';
import { SettingsService } from './settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public synchronizationEnabled = false;

  public constructor(
    private translateService: TranslateService,
    private databaseService: DatabaseService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit(): void {
    this.synchronizationEnabled = this.settingsService.getDatabaseSettings().enableSynchronization;

    this.translateService.setDefaultLang(this.settingsService.defaultLanguage);
    this.translateService.use(this.settingsService.getAppLanguage());

    this.databaseService.synchronizationSubject.subscribe((event) => {
      if (event.type === 'error') {
        console.error(event);
        this.snackBar.open('Sync failed. Going offline', undefined, { duration: 3000 });
        this.databaseService.disableSyncing();
      } else {
        this.snackBar.open('Synced!', undefined, { duration: 250 });
      }
    }, (error) => {
      console.error(error);
      this.snackBar.open('Sync broken!', 'Ok');
      this.databaseService.disableSyncing();
    });

    if (this.synchronizationEnabled) {
      this.databaseService.enableSyncing();
    }
  }

  public isSyncing() {
    return this.databaseService.isSyncing();
  }

  public toggleSynchronization() {
    if (this.databaseService.isSyncing()) {
      this.databaseService.disableSyncing();
    } else {
      this.databaseService.enableSyncing();
    }
  }
}
