import { Component, OnInit } from '@angular/core';
import { WordEntityService } from '../../services';
import { GuessService } from './guess.service';

import { environment } from '../../../environments/environment';
import { SearchOptions } from './search-options';

@Component({
  selector: 'guess',
  templateUrl: './guess.component.html',
  styleUrls: ['./guess.component.scss']
})
export class GuessComponent implements OnInit {
  public supportedLanguages: string[] = environment.languages;

  public searchOptions: SearchOptions = {
    mode: 'by-time',
    minutes: 15,
    amount: 75,
    sourceLanguage: this.supportedLanguages.length > 0 && this.supportedLanguages[0],
    targetLanguage: this.supportedLanguages.length > 0 && this.supportedLanguages[1],
    searchLevelEnabled: false,
    searchLevelMinimum: 0,
    searchLevelMaximum: 100
  };

  public words: any;

  public constructor(
    private wordEntityService: WordEntityService,
    private guessService: GuessService
  ) {
  }

  public ngOnInit(): void {
  }

  public searchWords() {
    this.guessService.findGuessWords(this.searchOptions).subscribe((result) => {
      this.words = result.map((x) => x.key);
    }, (error) => {
      console.error(error);
    });
  }
}
