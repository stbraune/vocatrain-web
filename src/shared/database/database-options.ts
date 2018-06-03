export interface DatabaseOptions<T> {
  name: string;
  serializeItem?: (item: T) => T;
  deserializeItem?: (item: T) => T;
  reconcileItem?: (conflictingItem: T, winningItem: T) => T;
  couchLuceneUrl?: string;
  debugging?: boolean;
}
