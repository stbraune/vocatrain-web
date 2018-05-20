export interface DatabaseFetchOptions<TKey> {
  include_docs?: boolean;
  startkey?: Partial<TKey>;
  endkey?: Partial<TKey>;
  limit?: number;
  descending?: boolean;
}
