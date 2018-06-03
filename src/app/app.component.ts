import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { pipe } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { DatabaseService, LoadingIndicatorService } from '../shared';
import { SettingsService } from '../shared';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public sidenavOpened = false;
  public _synchronizationEnabled = false;
  public _synchronizationEnabledUser = false;
  public _synchronizationRunning = false;
  public _synchronizationFailedToastShown = false;
  public syncingTimeout;
  public loadingIndicatorVisible;

  private _printedConflicts = false;

  public constructor(
    private translateService: TranslateService,
    private loadingIndicatorService: LoadingIndicatorService,
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
        this._synchronizationEnabledUser = true;
        this.databaseService.enableSyncing();
      } else {
        this._synchronizationEnabledUser = false;
        this.databaseService.disableSyncing();
      }
    });

    this.databaseService.databaseOpened.subscribe((database) => {
      console.log('Opened connection to database', database.getOptions().name, database.getDatabase());
      if (!this._printedConflicts) {
        this._printedConflicts = true;
        database.getConflicts(true).subscribe((conflicts) => {
          if (conflicts.rows.length > 0) {
            console.warn('All conflicts (maybe something to handle somewhere)', conflicts);
          } else {
            console.log('No conflicts in the database, hooray!');
          }
        }, (error) => {
          console.error('Error while getting all conflicts in the database', error);
        });
      }
    });

    this.databaseService.synchronizationSubject.subscribe((event) => {
      if (event.type === 'error') {
        console.error(event);
        this._synchronizationEnabled = false;
        this._synchronizationRunning = false;

        if (!this._synchronizationFailedToastShown) {
          this._synchronizationFailedToastShown = true;
          this.translateService.get('app.sync-failed').subscribe((text) => {
            this.snackBar.open(text, undefined, { duration: 3000 });
          });
        }

        setTimeout(() => {
          if (this._synchronizationEnabledUser) {
            this.databaseService.disableSyncing();
            this.databaseService.enableSyncing();
          }
        }, 1000);
      } else {
        this._synchronizationFailedToastShown = false;
        if (this.syncingTimeout) {
          clearTimeout(this.syncingTimeout);
        }

        this._synchronizationEnabled = true;
        this._synchronizationRunning = true;
        this.syncingTimeout = setTimeout(() => this._synchronizationRunning = false, 500);
      }
    }, (error) => {
      console.error(error);
      this.translateService.get(['app.sync-broken', 'app.sync-broken-ok']).subscribe((texts) => {
        this.snackBar.open(texts['app.sync-broken'], texts['app.sync-broken-ok']);
      });
      this.databaseService.disableSyncing();
    });

    let loadingIndicatorStartTimeout;
    let loadingIndicatorStopTimeout;
    this.loadingIndicatorService.startedLoading.subscribe((loadingStack) => {
      if (loadingIndicatorStartTimeout) {
        clearTimeout(loadingIndicatorStartTimeout);
      }

      if (loadingIndicatorStopTimeout) {
        clearTimeout(loadingIndicatorStopTimeout);
      }

      loadingIndicatorStartTimeout = setTimeout(() => {
        if (this.loadingIndicatorService.isLoading() && !this.loadingIndicatorVisible) {
          this.loadingIndicatorVisible = true;
        }
        loadingIndicatorStartTimeout = null;
      }, 500);
    });

    this.loadingIndicatorService.finishedLoading.subscribe((loadingStack) => {
      if (loadingIndicatorStartTimeout) {
        clearTimeout(loadingIndicatorStartTimeout);
      }

      if (loadingIndicatorStopTimeout) {
        clearTimeout(loadingIndicatorStopTimeout);
      }

      loadingIndicatorStopTimeout = setTimeout(() => {
        if (!this.loadingIndicatorService.isLoading() && this.loadingIndicatorVisible) {
          this.loadingIndicatorVisible = false;
        }
        loadingIndicatorStopTimeout = null;
      }, 500);
    });
  }

  public get synchronizationEnabled() {
    return this._synchronizationEnabled && this.databaseService.isSyncing();
  }

  public get synchronizationRunning() {
    return this._synchronizationRunning;
  }

  public toggleSynchronization() {
    if (this.databaseService.isSyncing()) {
      this._synchronizationEnabledUser = false;
      this.databaseService.disableSyncing();
    } else {
      this._synchronizationEnabledUser = true;
      this.databaseService.enableSyncing();
    }
  }
}
