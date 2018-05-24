import { DatabaseEntity } from '../database';
import { WordTypeEntity } from '../word-types';
import { Text } from './text';

export interface WordEntity extends DatabaseEntity {
  type: Partial<WordTypeEntity>;
  texts: Text[];
}
