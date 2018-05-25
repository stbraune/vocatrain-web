import { Injectable } from '@angular/core';

import { Observable, throwError, pipe, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { GameLogEntity } from './game-log.entity';
import { DatabaseService, Database } from '../database';

@Injectable()
export class GameLogEntityService {
  private db: Database<GameLogEntity>;

  public constructor(
    private databaseService: DatabaseService
  ) {
    this.db = this.databaseService.openDatabase({
      name: 'game-log',
      deserialize: (gameLogEntity) => {
        gameLogEntity.startTime = gameLogEntity.startTime && new Date(gameLogEntity.startTime);
        gameLogEntity.endTime = gameLogEntity.endTime && new Date(gameLogEntity.endTime);
        return gameLogEntity;
      }
    });
  }

  public getDatabase(): Database<GameLogEntity> {
    return this.db;
  }

  public startGameLog(mode: string): Observable<GameLogEntity> {
    return this.createGameLog(mode);
  }

  public incrementCorrect(gameLogEntity: GameLogEntity, durationReferenceDate: Date) {
    gameLogEntity.countCorrect++;
    gameLogEntity.countTotal++;
    return this.updateGameLog(gameLogEntity, durationReferenceDate);
  }

  public incrementWrong(gameLogEntity: GameLogEntity, durationReferenceDate: Date): Observable<GameLogEntity> {
    gameLogEntity.countWrong++;
    gameLogEntity.countTotal++;
    return this.updateGameLog(gameLogEntity, durationReferenceDate);
  }

  public finishGameLog(gameLogEntity: GameLogEntity, durationReferenceDate: Date) {
    return this.updateGameLog(gameLogEntity, durationReferenceDate);
  }

  public createGameLog(mode: string): Observable<GameLogEntity> {
    const now = new Date();
    return this.db.postEntity({
      mode: mode,
      startTime: now,
      endTime: now,
      durationInMillis: 0,
      countCorrect: 0,
      countWrong: 0,
      countTotal: 0
    }, `${mode}-${now.toISOString()}`).pipe(
      catchError((error) => {
        console.error(error);
        return throwError(error);
      })
    );
  }

  public updateGameLog(gameLogEntity: GameLogEntity, durationReferenceDate: Date): Observable<GameLogEntity> {
    const now = new Date();
    durationReferenceDate = durationReferenceDate || gameLogEntity.startTime;
    gameLogEntity.endTime = now;
    gameLogEntity.durationInMillis += gameLogEntity.endTime.getTime() - durationReferenceDate.getTime();
    return this.db.putEntity(gameLogEntity).pipe(
      catchError((error) => {
        console.error(error);
        return throwError(error);
      })
    );
  }
}
