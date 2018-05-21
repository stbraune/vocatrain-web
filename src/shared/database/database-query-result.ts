export interface DatabaseQueryResult<TEntity, TKey, TValue> {
  total_rows?: number;
  offset?: number;
  rows: {
    id?: string,
    key: TKey,
    value: TValue,
    doc?: TEntity
  }[];
}
