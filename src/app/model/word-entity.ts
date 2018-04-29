import { Entity } from './entity';
import { WordTypeEntity } from './word-type-entity';

export interface WordEntity extends Entity {
  type: Partial<WordTypeEntity>;
  texts: {
    [key: string]: {
      meta?: string,
      [lang: string]: string
    }
  };
}
