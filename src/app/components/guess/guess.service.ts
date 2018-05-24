
import { Injectable } from '@angular/core';
import { Observable, of, throwError, pipe } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import { Database, WordEntity, WordEntityService, SearchOptions, SearchResult, GameService } from '../../../shared';
import { environment } from '../../../environments/environment';


@Injectable()
export class GuessService {
  private db: Database<WordEntity>;

  public constructor(
    private wordEntityService: WordEntityService,
    private gameService: GameService
  ) {
    this.db = wordEntityService.getDatabase();
  }

  public findGuessWords(options: SearchOptions): Observable<SearchResult[]> {
    return this.gameService.findGuessWords('guess', options);
  }

  public guessRight(word: SearchResult) {
    const translatedWord = word.doc.texts[word.key.textIndex].words[word.key.answerLanguage];
    translatedWord.games = translatedWord.games || {};
    translatedWord.games['guess'] = translatedWord.games['guess'] || {
      date: new Date(),
      level: 0
    };

    translatedWord.games['guess'].level++;
    translatedWord.games['guess'].date = new Date();
    return this.db.putEntity(word.doc);
  }

  public guessWrong(word: SearchResult) {
    const translatedWord = word.doc.texts[word.key.textIndex].words[word.key.answerLanguage];
    translatedWord.games = translatedWord.games || {};
    translatedWord.games['guess'] = translatedWord.games['guess'] || {
      date: new Date(),
      level: 0
    };

    translatedWord.games['guess'].level = 0;
    translatedWord.games['guess'].date = new Date();
    return this.db.putEntity(word.doc);
  }
}
