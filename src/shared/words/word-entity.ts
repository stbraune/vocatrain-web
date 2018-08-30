import { DatabaseEntity } from '../database';
import { Text } from './text';

export interface WordEntity extends DatabaseEntity {
  texts: Text[];

  // used for dialog texts
  games?: {
    [lang: string]: {
      [mode: string]: {
        level: number,
        date: Date
      }
    }
  };
}
