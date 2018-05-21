import { DatabaseDocument } from './database-document';

export interface DatabaseEntity extends DatabaseDocument {
  createdAt?: Date;
  updatedAt?: Date;
  transient?: any;
}
