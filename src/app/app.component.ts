import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseService } from './services';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public constructor(
    private translateService: TranslateService,
    private databaseService: DatabaseService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit(): void {
    let userLang = navigator.language.split('-')[0];
    userLang = /(en|de|bg)/gi.test(userLang) ? userLang : 'de';
    userLang = 'de'; // fixme

    this.translateService.setDefaultLang('en');
    this.translateService.use(userLang);

    this.databaseService.synchronizationSubject.subscribe((event) => {
      if (event.type === 'error') {
        this.snackBar.open('Sync failed. Going offline', undefined, { duration: 3000 });
        this.databaseService.disableSyncing();
      } else {
        this.snackBar.open('Synced!', undefined, { duration: 250 });
      }
    }, (error) => {
      this.snackBar.open('Sync broken!', 'Ok');
      this.databaseService.disableSyncing();
    });
    this.databaseService.enableSyncing();
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
