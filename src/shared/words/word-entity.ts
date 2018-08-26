import { DatabaseEntity } from '../database';
import { Text } from './text';

export interface WordEntity extends DatabaseEntity {
  texts: Text[];

  // used for dialog texts
  games?: {
    [mode: string]: {
      level: number,
      date: Date
    }
  };
}
