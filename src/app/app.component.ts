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
  public sidenavOpened = false;
  public syncing = false;
  public syncingTimeout;

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
      if (databaseSettings.remote.enableSynchronization) {
        this.databaseService.enableSyncing();
      } else {
        this.databaseService.disableSyncing();
      }
    });

    this.databaseService.synchronizationSubject.subscribe((event) => {
      if (event.type === 'error') {
        console.error(event);
        this.translateService.get('app.sync-failed').subscribe((text) => {
          this.snackBar.open(text, undefined, { duration: 3000 });
        });
      } else {
        if (this.syncingTimeout) {
          clearTimeout(this.syncingTimeout);
        }

        this.syncing = true;
        this.syncingTimeout = setTimeout(() => this.syncing = false, 500);
      }
    }, (error) => {
      console.error(error);
      this.translateService.get(['app.sync-broken', 'app.sync-broken-ok']).subscribe((texts) => {
        this.snackBar.open(texts['app.sync-broken'], texts['app.sync-broken-ok']);
      });
      this.databaseService.disableSyncing();
    });
  }

  public synchronizationEnabled() {
    return this.databaseService.isSyncing();
  }

  public synchronizationRunning() {
    return this.syncing;
  }

  public toggleSynchronization() {
    if (this.databaseService.isSyncing()) {
      this.databaseService.disableSyncing();
    } else {
      this.databaseService.enableSyncing();
    }
  }
}
