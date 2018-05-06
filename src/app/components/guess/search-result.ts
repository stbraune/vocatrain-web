import { WordEntity } from '../../model';

export interface SearchResult {
  key: {
    searchLanguages: string[],
    reoccurAt: Date,
    answerHash: number,
    answerLevel: number,
    answerLanguage: string,
    answer: string,
    questionLanguage: string,
    question: string,
    textIndex: number
  };
  doc: WordEntity;
}
