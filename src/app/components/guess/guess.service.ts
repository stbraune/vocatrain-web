import { Injectable } from '@angular/core';
import { WordEntityService, Database } from '../../services';
import { WordEntity } from '../../model';
import { environment } from '../../../environments/environment';

declare const emit: (key: any) => void;

@Injectable()
export class GuessService {
  private db: Database<WordEntity>;

  public constructor(
    private wordEntityService: WordEntityService
  ) {
    this.db = wordEntityService.getDatabase();
  }

  public findGuessWords() {
    const langs = JSON.stringify(environment.languages);
    return this.db.getQuery('words', 'guess-words',
      `function (doc) {
        if (doc._id.substr(0, 'word_'.length) === 'word_') {
          doc.texts.forEach(function (text, idx) {
            ${langs}
              .map(function (lang) {
                return { lang: lang, word: text.words[lang] };
              })
              .forEach(function (langAndWord) {
                const word = langAndWord.word;
                const level = word.level && word.level['guess'];
                emit({
                  lang: langAndWord.lang,
                  level: level || 0,
                  word: word.value,
                  text: idx
                });
              });
          });
        }
      }`
    ).switchMap((x) => {
      console.log(x);
      return this.db.runQueryRaw('words', 'guess-words', {
        include_docs: true
      });
    });
  }
}
