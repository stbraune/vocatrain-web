import { Component, OnInit } from '@angular/core';
import { SettingsService } from './settings.service';

@Component({
  selector: 'settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  public languages: string[] = [];
  public language = '';

  public constructor(
    private settingsService: SettingsService
  ) {
  }

  public ngOnInit() {
    this.languages = this.settingsService.getLanguages();
    this.languages.sort();
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

  public onSave() {
    this.settingsService.setLanguages(this.languages);
  }
}
