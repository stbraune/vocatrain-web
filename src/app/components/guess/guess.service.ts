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

  public findGuessWords(reoccurBefore: Date, sourceLanguage: string, targetLanguage: string, mod = 6) {
    const langs = JSON.stringify([sourceLanguage, targetLanguage]);
    const viewId = `guess-words-${sourceLanguage}-${targetLanguage}-${mod}`;
    return this.db.getQuery('words', viewId,
      `function (doc) {
        const sourceLanguage = '${sourceLanguage}';
        const targetLanguage = '${targetLanguage}';
        const mod = ${mod};

        function normalizeDate(d) {
          return new Date(d.getTime() - (((d.getUTCHours() * 60) + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) * 1000);
        }

        function calculateDistance(a, b) {
          return a.getTime() - b.getTime();
        }

        function convertDays(millis) {
          return millis / (24 * 60 * 60 * 1000);
        }

        function convertMillis(days) {
          return days * 24 * 60 * 60 * 1000;
        }

        function calculateHash(s) {
          var result = 0, i, chr;
          if (s.length === 0) return result;
          for (i = 0; i < s.length; i++) {
            chr   = s.charCodeAt(i);
            result  = ((result << 5) - result) + chr;
            result |= 0;
          }
          return result;
        }

        function getRequiredDistance(level, mod) {
          return level % mod === 0 ? 0 : Math.pow(2, (level % mod) - 1);
        }

        function getRequiredLanguage(level, mod, sourceLanguage, targetLanguage) {
          return level % (mod * 2) < mod ? sourceLanguage : targetLanguage;
        }

        if (doc._id.substr(0, 'word_'.length) === 'word_') {
          doc.texts.forEach(function (text, textIndex) {
            [sourceLanguage, targetLanguage]
              .map(function (language) {
                return { language: language, word: text.words[language] };
              })
              .forEach(function (langAndWord) {
                const answerLanguage = langAndWord.language;
                const answerWord = langAndWord.word;

                const questionLanguage = answerLanguage === sourceLanguage ? targetLanguage : sourceLanguage;
                const questionWord = text.words[questionLanguage];

                const answerLevel = (answerWord.games && answerWord.games['guess'].level) || 0;
                const answerThen = new Date((answerWord.games && answerWord.games['guess'].date) || 0);

                const requiredLanguage = getRequiredLanguage(answerLevel, mod, sourceLanguage, targetLanguage);
                const requiredDistance = getRequiredDistance(answerLevel, mod);
                const reoccurAt = new Date(normalizeDate(answerThen).getTime() + convertMillis(requiredDistance));

                if (requiredLanguage === answerLanguage) {
                  emit({
                    reoccurAt: reoccurAt,
                    answerHash: calculateHash(answerWord.value),
                    answerLevel: answerLevel,
                    answerLanguage: answerLanguage,
                    answer: answerWord.value,
                    questionLanguage: questionLanguage,
                    question: questionWord.value,
                    textIndex: textIndex
                  });
                }
              });
          });
        }
      }`
    ).switchMap((x) => {
      console.log(x);
      return this.db.runQueryRaw('words', viewId, {
        include_docs: true,
        endkey: {
          reoccurAt: reoccurBefore
        }
      });
    });
  }
}
