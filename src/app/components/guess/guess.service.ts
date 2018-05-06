import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { WordEntityService, Database } from '../../services';
import { WordEntity } from '../../model';
import { environment } from '../../../environments/environment';

import { SearchOptions } from './search-options';
import { SearchResult } from './search-result';

declare const emit: (key: any) => void;

@Injectable()
export class GuessService {
  private db: Database<WordEntity>;

  public constructor(
    private wordEntityService: WordEntityService
  ) {
    this.db = wordEntityService.getDatabase();
  }

  public findGuessWords(options: SearchOptions): Observable<SearchResult[]> {
    options.reoccurBefore = options.reoccurBefore || new Date();
    options.mod = options.mod || 6;
    options.searchLanguages = options.searchLanguages || [options.sourceLanguage, options.targetLanguage];

    const langs = JSON.stringify([options.sourceLanguage, options.targetLanguage]);
    const viewId = `guess-words-${options.sourceLanguage}-${options.targetLanguage}-${options.mod}`;
    return this.db.getQuery('words', viewId,
      `function (doc) {
        const sourceLanguage = '${options.sourceLanguage}';
        const targetLanguage = '${options.targetLanguage}';
        const mod = ${options.mod};

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

        function assign(target, varArgs) { // .length of function is 2
          'use strict';
          if (target == null) { // TypeError if undefined or null
            throw new TypeError('Cannot convert undefined or null to object');
          }

          var to = Object(target);
          for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];

            if (nextSource != null) { // Skip over if undefined or null
              for (var nextKey in nextSource) {
                // Avoid bugs when hasOwnProperty is shadowed
                if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                  to[nextKey] = nextSource[nextKey];
                }
              }
            }
          }
          return to;
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
                var reoccurAt = new Date(normalizeDate(answerThen).getTime() + convertMillis(requiredDistance));
                const reoccurAtSame = reoccurAt.getTime() === normalizeDate(answerThen).getTime();
                if (reoccurAtSame) {
                  reoccurAt = new Date(answerThen.getTime() + (300 + Math.floor(Math.random() * 900) * 1000));
                }

                const indexKey = {
                  reoccurAt: reoccurAt,
                  answerHash: calculateHash(answerWord.value),
                  answerLevel: answerLevel,
                  answerLanguage: answerLanguage,
                  answerAt: answerThen,
                  answer: answerWord.value,
                  questionLanguage: questionLanguage,
                  question: questionWord.value,
                  meta: text.meta,
                  textIndex: textIndex
                };
                if (requiredLanguage === answerLanguage) {
                  // for searching words in both directions, level dependent
                  emit(assign({
                    searchLanguages: [sourceLanguage, targetLanguage],
                    searchMinLevel: answerLevel
                  }, indexKey));
                  emit(assign({
                    searchLanguages: [targetLanguage, sourceLanguage],
                    searchMinLevel: answerLevel
                  }, indexKey));
                  emit(assign({
                    searchLanguages: [sourceLanguage, targetLanguage]
                  }, indexKey));
                  emit(assign({
                    searchLanguages: [targetLanguage, sourceLanguage]
                  }, indexKey));
                }

                // for searching directly for guessing words in target language, independent of current level
                emit(assign({
                  searchLanguages: [answerLanguage],
                  searchMinLevel: answerLevel
                }, indexKey));
                emit(assign({
                  searchLanguages: [answerLanguage]
                }, indexKey));
              });
          });
        }
      }`
    ).switchMap((x) => {
      const couchOptions = {
        include_docs: true,
        startkey: {
          searchLanguages: options.searchLanguages,
          searchMinLevel: options.searchLevelEnabled ? (options.searchLevelMinimum || 0) : undefined,
        },
        endkey: {
          searchLanguages: options.searchLanguages,
          searchMinLevel: options.searchLevelEnabled ? (options.searchLevelMaximum || {}) : undefined,
          reoccurAt: options.reoccurBefore
        },
        limit: options.limit
      };
      return this.db.runQueryRaw('words', viewId, couchOptions).map((result) => result.rows);
    });
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
