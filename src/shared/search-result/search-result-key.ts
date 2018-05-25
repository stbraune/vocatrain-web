export interface SearchResultKey {
  searchLanguages: string[];
  reoccurAt: string | Date;
  answerHash: number;
  answerLevel: number;
  answerLanguage: string;
  answer: string;
  answerAt: Date;
  questionLanguage: string;
  question: string;
  tags: string[];
  meta: string;
  textIndex: number;
}
