import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { pipe } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { DatabaseService } from '../shared';
import { SettingsService } from '../settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public synchronizationEnabled = false;
  public sidenavOpened = true;

  public constructor(
    private translateService: TranslateService,
    private databaseService: DatabaseService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit(): void {
    this.translateService.setDefaultLang(this.settingsService.defaultLanguage);
    this.settingsService.appSettingsChanged.pipe(
      map((appSettings) => appSettings.appLanguage),
      switchMap((appLanguage) => this.translateService.use(appLanguage))
    ).subscribe();

    this.settingsService.databaseSettingsChanged.subscribe((databaseSettings) => {
      this.synchronizationEnabled = databaseSettings.remote.enableSynchronization;
      if (this.synchronizationEnabled) {
        this.databaseService.enableSyncing();
      } else {
        this.databaseService.disableSyncing();
      }
    });

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
