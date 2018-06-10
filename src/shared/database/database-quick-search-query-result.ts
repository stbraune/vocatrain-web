export interface DatabaseQuickSearchQueryResult<TEntity> {
  total_rows?: number;
  rows?: {
    score: number,
    doc?: TEntity,
    id: string
  }[];
}
