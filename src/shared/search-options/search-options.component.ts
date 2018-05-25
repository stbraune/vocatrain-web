import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';

import { SearchOptions } from './search-options';

@Component({
  selector: 'search-options',
  templateUrl: './search-options.component.html',
  styleUrls: ['./search-options.component.scss']
})
export class SearchOptionsComponent implements OnInit {
  @Input()
  public supportedLanguages: string[] = [];

  @Input()
  public searchOptions: SearchOptions = {
    mode: 'by-time',
    minutes: 15,
    amount: 75,
    sourceLanguage: this.supportedLanguages.length > 0 && this.supportedLanguages[0],
    targetLanguage: this.supportedLanguages.length > 1 && this.supportedLanguages[1],
    searchLanguagesDirection: 'both',
    searchLanguages: [
      this.supportedLanguages.length > 0 && this.supportedLanguages[0],
      this.supportedLanguages.length > 1 && this.supportedLanguages[1]
    ],
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100
  };

  @Output()
  public searchOptionsChange = new EventEmitter<SearchOptions>();

  public constructor() {
  }

  public ngOnInit(): void {
  }

  public toggleLanguageDirection() {
    switch (this.searchOptions.searchLanguagesDirection) {
      case 'stt':
        this.searchOptions.searchLanguagesDirection = 'both';
        this.searchOptions.searchLanguages = [this.searchOptions.sourceLanguage, this.searchOptions.targetLanguage];
        this.onPropertyChanged();
        break;
      case 'both':
        this.searchOptions.searchLanguagesDirection = 'tts';
        this.searchOptions.searchLanguages = [this.searchOptions.sourceLanguage];
        this.onPropertyChanged();
        break;
      case 'tts':
        this.searchOptions.searchLanguagesDirection = 'stt';
        this.searchOptions.searchLanguages = [this.searchOptions.targetLanguage];
        this.onPropertyChanged();
        break;
      default:
        throw new Error(`Unsupported language direction ${this.searchOptions.searchLanguagesDirection}`);
    }
  }

  public setMode(mode: 'by-time' | 'by-amount') {
    this.searchOptions.mode = mode;
    this.onPropertyChanged();
  }

  public onPropertyChanged() {
    this.searchOptionsChange.emit(this.searchOptions);
  }
}
