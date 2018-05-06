export interface SearchOptions {
  mode?: 'by-time' | 'by-amount';
  minutes?: number;
  amount?: number;
  reoccurBefore?: Date;
  sourceLanguage: string;
  targetLanguage: string;
  searchLanguages?: string[];
  searchLevelEnabled: boolean;
  searchLevelMinimum?: number;
  searchLevelMaximum?: number;
  mod?: number;
  limit?: number;
}
