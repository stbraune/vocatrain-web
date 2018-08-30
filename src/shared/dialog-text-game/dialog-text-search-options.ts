export interface DialogTextSearchOptions {
  reoccurAfter?: Date;
  reoccurBefore?: Date;
  sourceLanguage?: string;
  targetLanguage?: string;
  searchLanguagesDirection?: 'stt' | 'tts' | 'both';
  searchLanguages?: string[];
  searchLevelEnabled: boolean;
  searchLevelMinimum?: number;
  searchLevelMaximum?: number;
  mod?: number;
}
