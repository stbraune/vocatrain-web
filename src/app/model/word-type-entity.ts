import { DatabaseEntity } from '../../shared';

export interface WordTypeEntity extends DatabaseEntity {
  _id?: string;
  _rev?: string;
  title: string;
  tags: string[];
}
