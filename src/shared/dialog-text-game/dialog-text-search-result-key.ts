export interface DialogTextSearchResultKey {
  searchLanguages: string[];
  reoccurAt: string | Date;
  success: number;
  answerLevel: number;
  answerLanguage: string;
  answers: string[];
  answerAt: Date;
  questionLanguage: string;
  questions: string[];
  tags: string[][];
  meta: string[];
  history: (null | { answer: string, correct: boolean })[];
  count: number;
}
