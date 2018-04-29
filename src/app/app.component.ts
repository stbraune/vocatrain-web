import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'app';

  public constructor(
    private translateService: TranslateService
  ) {
  }

  public ngOnInit(): void {
    let userLang = navigator.language.split('-')[0];
    userLang = /(en|de|bg)/gi.test(userLang) ? userLang : 'de';
    userLang = 'de'; // fixme

    this.translateService.setDefaultLang('en');
    this.translateService.use(userLang);
  }
}
