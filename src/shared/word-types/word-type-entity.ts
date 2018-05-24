import { DatabaseEntity } from '../database';

export interface WordTypeEntity extends DatabaseEntity {
  _id?: string;
  _rev?: string;
  title: string;
  tags: string[];
}
