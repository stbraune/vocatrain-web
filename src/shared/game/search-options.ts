export interface SearchOptions {
  mode?: 'by-time' | 'by-amount';
  minutes?: number;
  amount?: number;
  reoccurAfter?: Date;
  reoccurBefore?: Date;
  answerHash?: number;
  sourceLanguage?: string;
  targetLanguage?: string;
  searchLanguagesDirection?: 'stt' | 'tts' | 'both';
  searchLanguages?: string[];
  searchLevelEnabled: boolean;
  searchLevelMinimum?: number;
  searchLevelMaximum?: number;
  mod?: number;
  limit?: number;
}
