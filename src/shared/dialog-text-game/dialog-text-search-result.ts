import { WordEntity } from '../words';
import { DialogTextSearchResultKey } from './dialog-text-search-result-key';

export interface DialogTextSearchResult {
  id?: string;
  key: DialogTextSearchResultKey;
  doc?: WordEntity;
}
