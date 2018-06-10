export interface DatabaseRunQuickSearchQueryOptions<TEntity> {
  query?: string;
  fields: string[] | { [field: string]: number };
  filter?: (doc: TEntity) => boolean;
  mm?: string;
  skip?: number;
  limit?: number;
  include_docs?: boolean;
  highlighting?: boolean;
  highlighting_pre?: string;
  highlighting_post?: string;
  build?: boolean;
  destroy?: boolean;
}
