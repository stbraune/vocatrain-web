export interface DatabaseGetQueryOptions<TEntity, TKey, TValue, TReduce> {
  designDocument: string;
  viewName: string;
  mapFunction?: string | ((item: TEntity, emit: (key: TKey, value?: TValue) => void) => void);
  reduceFunction?: string | ((keys: null | TKey[], values: TReduce[] | TValue[], rereduce: boolean) => TReduce);
}
