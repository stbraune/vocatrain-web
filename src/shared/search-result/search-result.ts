import { WordEntity } from '../words';
import { SearchResultKey } from './search-result-key';

export interface SearchResult {
  id?: string;
  key: SearchResultKey;
  doc?: WordEntity;
}
