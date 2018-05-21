import { DatabaseDocument } from './database-document';

export interface DatabaseDesignDocument extends DatabaseDocument {
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
