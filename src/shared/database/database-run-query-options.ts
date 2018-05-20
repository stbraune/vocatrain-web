import { DatabaseFetchOptions } from './database-fetch-options';

export interface DatabaseRunQueryOptions<TKey> extends DatabaseFetchOptions<TKey> {
  designDocument: string;
  viewName: string;
}
