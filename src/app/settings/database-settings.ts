export interface DatabaseSettings {
  databaseName: string;
  couchDbUrl?: string;
  couchDbLuceneUrl?: string;
  enableSynchronization?: boolean;
}
