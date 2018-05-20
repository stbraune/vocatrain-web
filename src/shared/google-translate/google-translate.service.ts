
import { throwError, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { GoogleTranslateOptions } from './google-translate-options';
import { GoogleTranslateResult } from './google-translate-result';
import { SettingsService, AppSettings } from '../../settings';

@Injectable()
export class GoogleTranslateService {
  private backendUrl: string;

  public constructor(
    private settingsService: SettingsService,
    private httpClient: HttpClient
  ) {
    this.settingsService.appSettingsChanged.subscribe((appSettings) => {
      this.backendUrl = appSettings.backendUrl;
    });
  }

  public translateConfigured(): boolean {
    return !!this.backendUrl;
  }

  public translate(text: string, options: GoogleTranslateOptions): Observable<GoogleTranslateResult> {
    if (!this.backendUrl) {
      return throwError(`Backend not configured`);
    }

    return this.httpClient.get<GoogleTranslateResult>(`${this.backendUrl}/translate`, {
      params: {
        from: options.from,
        to: options.to,
        text: text
      }
    });
  }
}
