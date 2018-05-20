export interface DatabaseGetFulltextQueryOptions<TEntity> {
  designDocument: string;
  indexName: string;
  indexFunction?: string | ((item: TEntity) => void);
}
