import { Component, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, Input } from '@angular/core';

import { DialogTextSearchOptions } from './dialog-text-search-options';

@Component({
  selector: 'dialog-text-search-options',
  templateUrl: './dialog-text-search-options.component.html',
  styleUrls: ['./dialog-text-search-options.component.scss']
})
export class DialogTextSearchOptionsComponent implements OnInit, OnChanges {
  @Input()
  public supportedLanguages: string[] = [];

  @Input()
  public searchOptions: DialogTextSearchOptions = {
    sourceLanguage: this.supportedLanguages.length > 0 && this.supportedLanguages[0],
    targetLanguage: this.supportedLanguages.length > 1 && this.supportedLanguages[1],
    searchLanguagesDirection: 'both',
    searchLanguages: [
      this.supportedLanguages.length > 0 && this.supportedLanguages[0],
      this.supportedLanguages.length > 1 && this.supportedLanguages[1]
    ],
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100,
    mod: 6
  };

  public maxDistanceInDays;

  @Output()
  public searchOptionsChange = new EventEmitter<DialogTextSearchOptions>();

  @Output()
  public enterPressed = new EventEmitter<void>();

  public constructor() {
  }

  public ngOnInit(): void {
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.searchOptions && this.searchOptions) {
      this.searchOptions.mod = this.searchOptions.mod || 6;
      this.onModChanged();
    }
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

  public onModChanged() {
    const maxDistanceInDays = Math.pow(2, this.searchOptions.mod - 2);
    if (maxDistanceInDays !== this.maxDistanceInDays) {
      this.maxDistanceInDays = maxDistanceInDays;
      this.onMaxDistanceInDaysChanged();
    }
  }

  public onMaxDistanceInDaysChanged() {
    const mod = Math.ceil(Math.log2(this.maxDistanceInDays)) + 2;
    if (mod !== this.searchOptions.mod) {
      this.searchOptions.mod = mod;
      console.log('opts', this.searchOptions);
      this.onPropertyChanged();
    }
  }

  public onPropertyChanged() {
    this.searchOptionsChange.emit(this.searchOptions);
  }

  public onKeyDown($event: KeyboardEvent) {
    if ($event.which === 13) {
      this.enterPressed.emit();
    }
  }
}
