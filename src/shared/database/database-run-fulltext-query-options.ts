export interface DatabaseRunFulltextQueryOptions {
  designDocument: string;
  indexName: string;
  q?: string;
  skip?: number;
  limit?: number;
  include_docs?: boolean;
}
