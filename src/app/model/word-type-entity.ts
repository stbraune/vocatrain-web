import { Entity } from './entity';

export interface WordTypeEntity extends Entity {
  _id?: string;
  _rev?: string;
  title: string;
  keys: string[];
}
