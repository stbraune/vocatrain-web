export interface DatabaseOptions<T> {
  name: string;
  deserialize?: (item: T) => T;
  serialize?: (item: T) => T;
  couchLuceneUrl?: string;
  debugging?: boolean;
}
