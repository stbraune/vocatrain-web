import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { WordEntityService } from '../../services';
import { GuessService } from './guess.service';

import { environment } from '../../../environments/environment';
import { SearchOptions } from './search-options';
import { SearchResult } from './search-result';

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

  public started = false;
  public startedAt: Date;
  public currentWord: SearchResult;
  public currentWordState = -1;
  public duration = '0:00';
  public durationInterval;
  public totalWords = 0;
  public finished = false;
  public finishReason: 'no-more-words' | 'reached-amount' | 'reached-minutes';

  public constructor(
    private wordEntityService: WordEntityService,
    private guessService: GuessService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnInit(): void {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.onKeyDown(event);
    }, false);
  }

  public startGuessing() {
    this.finished = false;
    this.started = true;
    this.startedAt = new Date();
    this.duration = '0:00';
    this.totalWords = 0;

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    this.durationInterval = setInterval(() => {
      this.duration = this.getDuration();

      if (this.searchOptions.mode === 'by-time') {
        const millis = new Date().getTime() - this.startedAt.getTime();
        const minutes = millis / 1000 / 60;
        if (minutes >= this.searchOptions.minutes) {
          this.finishGuessing('reached-minutes');
        }
      }
    }, 1000);
    this.nextWord();
  }

  public getDuration() {
    return this.formatDuration(this.startedAt, new Date());
  }

  public formatDuration(start: Date, end: Date): string {
    return this.formatSeconds(((+end) - (+start)) / 1000);
  }

  public formatSeconds(seconds: number): string {
    const h = this.parseInt(seconds / 3600);
    const m = this.parseInt((seconds % 3600) / 60);
    const s = this.parseInt(seconds % 60);

    const hs = h > 9 ? h : '0' + h;
    const ms = m > 9 ? m : '0' + m;
    const ss = s > 9 ? s : '0' + s;

    return hs + ':' + ms + ':' + ss;
  }

  private parseInt(n: any): number {
    return parseInt(<string>n, 10);
  }

  public stopGuessing() {
    this.started = false;
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
  }

  public finishGuessing(reason: 'no-more-words' | 'reached-amount' | 'reached-minutes') {
    this.finished = true;
    this.finishReason = reason;
    this.stopGuessing();
  }

  public onKeyDown($event: KeyboardEvent) {
    if (!this.started) {
      return;
    }

    const target = <HTMLInputElement>$event.target;
    if ($event.which === 37 || $event.which === 36) {
      // left, home
      this.guessedWrong();
      $event.preventDefault();
    }

    if ($event.which === 38 || $event.which === 33) {
      // up, page up
      this.showTranslation();
      $event.preventDefault();
    }

    if ($event.which === 39 || $event.which === 35) {
      // right, end
      this.guessedRight();
      $event.preventDefault();
    }

    if ($event.which === 40 || $event.which === 34) {
      // down, page down
      this.hideTranslation();
      $event.preventDefault();
    }
  }

  public hideTranslation() {
    if (this.currentWordState === 1) {
      this.currentWordState = 0;
      console.log('Hiding translation');
    }
  }

  public showTranslation() {
    if (this.currentWordState === 0) {
      this.currentWordState = 1;
      console.log('Showing translation');
    }
  }

  public guessedRight() {
    if (this.currentWordState !== 1) {
      return;
    }

    this.guessedWord();
    console.log('Guessed it right!');
    this.guessService.guessRight(this.currentWord).subscribe((result) => {
      this.nextWord();
    }, (error) => {
      console.error(error);
    });
  }

  public guessedWrong() {
    if (this.currentWordState !== 1) {
      return;
    }

    this.guessedWord();
    console.log('Guessed it wrong!');
    this.guessService.guessWrong(this.currentWord).subscribe((result) => {
      this.nextWord();
    }, (error) => {
      console.error(error);
    });
  }

  private guessedWord() {
    this.currentWordState = 2;
    this.totalWords++;

    switch (this.searchOptions.mode) {
      case 'by-amount':
        if (this.totalWords === this.searchOptions.amount) {
          this.finishGuessing('reached-amount');
        }
        break;
      case 'by-time':
        break;
      default:
        throw new Error(`Unsupported mode: ${this.searchOptions.mode}`);
    }
  }

  public nextWord() {
    this.currentWordState = -1;
    this.currentWord = undefined;
    this.guessService.findGuessWords(Object.assign({ limit: 1 }, this.searchOptions)).subscribe((searchResults) => {
      console.log(searchResults);
      if (searchResults.length === 1) {
        this.currentWordState = 0;
        this.currentWord = searchResults[0];
        this.currentWord.key.answerAt = new Date(this.currentWord.key.answerAt);
      } else {
        this.finishGuessing('no-more-words');
      }
    }, (err) => {
      console.error(err);
      this.snackBar.open('Oops!', 'Ok');
    });
  }
}
