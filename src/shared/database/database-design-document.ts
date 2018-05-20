import { DatabaseEntity } from './database-entity';

export interface DatabaseDesignDocument extends DatabaseEntity {
  views?: {
    [viewName: string]: {
      map?: string,
      reduce?: string
    }
  };
  fulltext?: {
    [indexName: string]: {
      index?: string
    }
  };
}
