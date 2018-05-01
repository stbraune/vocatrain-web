import { Entity } from './entity';
import { WordTypeEntity } from './word-type-entity';
import { Text } from './text';

export interface WordEntity extends Entity {
  type: Partial<WordTypeEntity>;
  texts: Text[];
}
