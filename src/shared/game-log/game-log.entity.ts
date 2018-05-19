import { Entity } from '../../app/model';

export interface GameLogEntity extends Entity {
  mode: string;
  startTime: Date;
  endTime: Date;
  durationInMillis: number;
  countCorrect: number;
  countWrong: number;
  countTotal: number;
}
