import { Injectable } from '@angular/core';

@Injectable()
export class SettingsService {
  public constructor() {
  }

  public getLanguages(): string[] {
    const languages = localStorage.getItem('settings.languages');
    return languages ? JSON.parse(languages) : [];
  }

  public setLanguages(languages: string[]) {
    localStorage.setItem('settings.languages', JSON.stringify(languages));
  }
}
