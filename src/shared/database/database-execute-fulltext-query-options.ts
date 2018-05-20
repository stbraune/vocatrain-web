import { DatabaseGetFulltextQueryOptions } from './database-get-fulltext-query-options';
import { DatabaseRunFulltextQueryOptions } from './database-run-fulltext-query-options';

export interface DatabaseExecuteFulltextQueryOptions<TEntity> extends
  DatabaseGetFulltextQueryOptions<TEntity>,
  DatabaseRunFulltextQueryOptions {
}
