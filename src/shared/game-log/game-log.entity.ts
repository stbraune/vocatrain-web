import { DatabaseEntity } from '../database';

export interface GameLogEntity extends DatabaseEntity {
  mode: string;
  startTime: Date;
  endTime: Date;
  durationInMillis: number;
  countCorrect: number;
  countWrong: number;
  countTotal: number;
}
