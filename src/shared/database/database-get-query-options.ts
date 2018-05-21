export interface DatabaseGetQueryOptions<TEntity, TKey, TValue, TReduce> {
  designDocument: string;
  viewName: string;
  mapFunction?: (emit: (key: TKey, value?: TValue) => void) => string | ((item: TEntity) => void);
  reduceFunction?: () => string | ((keys: null | TKey[], values: TReduce[] | TValue[], rereduce: boolean) => TReduce);
}
