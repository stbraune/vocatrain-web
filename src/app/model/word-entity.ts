import { DatabaseEntity } from '../../shared';
import { WordTypeEntity } from './word-type-entity';
import { Text } from './text';

export interface WordEntity extends DatabaseEntity {
  type: Partial<WordTypeEntity>;
  texts: Text[];
}
