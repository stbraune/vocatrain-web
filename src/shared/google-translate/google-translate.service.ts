import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/zip';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';

import { GoogleTranslateOptions } from './google-translate-options';
import { GoogleTranslateResult } from './google-translate-result';
import { SettingsService, BackendSettings } from '../../app/settings';

@Injectable()
export class GoogleTranslateService {
  public constructor(
    private settingsService: SettingsService,
    private httpClient: HttpClient
  ) {
  }

  public translate(text: string, options: GoogleTranslateOptions): Observable<GoogleTranslateResult> {
    const backendSettings = this.settingsService.getBackendSettings();
    if (!backendSettings.baseUrl) {
      return Observable.throw(`Backend not configured`);
    }

    return this.httpClient.get<GoogleTranslateResult>(`${backendSettings.baseUrl}/translate`, {
      params: {
        from: options.from,
        to: options.to,
        text: text
      }
    });
  }
}
