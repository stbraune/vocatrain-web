import { DatabaseEntity } from '../database';
import { Text } from './text';

export interface WordEntity extends DatabaseEntity {
  texts: Text[];
}
