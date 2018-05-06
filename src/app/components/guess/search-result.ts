import { WordEntity } from '../../model';

export interface SearchResult {
  key: {
    searchLanguages: string[],
    reoccurAt: Date,
    answerHash: number,
    answerLevel: number,
    answerLanguage: string,
    answer: string,
    answerAt: Date,
    questionLanguage: string,
    question: string,
    tags: string[],
    meta: string,
    textIndex: number
  };
  doc: WordEntity;
}
