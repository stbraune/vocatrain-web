import { Component, OnInit } from '@angular/core';
import { WordEntityService } from '../../services';
import { GuessService } from './guess.service';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'guess',
  templateUrl: './guess.component.html',
  styleUrls: ['./guess.component.scss']
})
export class GuessComponent implements OnInit {
  public guessMode: 0 | 1 = 0;
  public minutes = 15;
  public count = 75;

  public supportedLanguages: string[] = environment.languages;

  public sourceLanguage: string = this.supportedLanguages.length > 0 && this.supportedLanguages[0];
  public targetLanguage: string = this.supportedLanguages.length > 0 && this.supportedLanguages[1];
  public languageDirection: 'stt' | 'tts' | 'both' = 'both';
  public levelFilterEnabled = false;
  public minimumLevel = 0;
  public maximumLevel = 100;

  public words: any;

  public constructor(
    private wordEntityService: WordEntityService,
    private guessService: GuessService
  ) {
  }

  public ngOnInit(): void {
  }

  public toggleLanguageDirection() {
    switch (this.languageDirection) {
      case 'stt':
        this.languageDirection = 'both';
        break;
      case 'both':
        this.languageDirection = 'tts';
        break;
      case 'tts':
        this.languageDirection = 'stt';
        break;
      default:
        throw new Error(`Unsupported language direction ${this.languageDirection}`);
    }
  }

  public searchWords() {
    this.guessService.findGuessWords({
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      searchLanguages: this.languageDirection === 'both'
        ? [this.sourceLanguage, this.targetLanguage]
        : this.languageDirection === 'stt'
          ? [this.targetLanguage]
          : [this.sourceLanguage],
      searchMinLevel: this.levelFilterEnabled ? this.minimumLevel : undefined,
      searchMaxLevel: this.levelFilterEnabled ? this.maximumLevel : undefined
    }).subscribe((result) => {
      this.words = result.map((x) => x.key);
    }, (error) => {
      console.error(error);
    });
  }
}
