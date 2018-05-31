export interface DatabaseSettings {
  local: {
    databaseName?: string;
  };
  remote: {
    databaseName?: string;
    couchDbUrl?: string;
    enableSynchronization?: boolean;
  };
  fti: {
    databaseName?: string;
    couchDbLuceneUrl?: string;
  };
}
