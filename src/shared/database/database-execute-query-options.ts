import { DatabaseGetQueryOptions } from './database-get-query-options';
import { DatabaseRunQueryOptions } from './database-run-query-options';

export interface DatabaseExecuteQueryOptions<TEntity, TKey, TValue, TReduce> extends
  DatabaseGetQueryOptions<TEntity, TKey, TValue, TReduce>,
  DatabaseRunQueryOptions<TKey> {
}
