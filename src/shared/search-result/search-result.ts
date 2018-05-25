import { WordEntity } from '../words';
import { SearchResultKey } from './search-result-key';

export interface SearchResult {
  key: SearchResultKey;
  doc?: WordEntity;
}
