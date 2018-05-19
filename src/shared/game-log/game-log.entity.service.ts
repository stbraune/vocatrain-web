import { Injectable } from '@angular/core';

import { Observable, throwError, pipe, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { DatabaseService, Database } from '../../app/services';
import { GameLogEntity } from './game-log.entity';

@Injectable()
export class GameLogEntityService {
  private db: Database<GameLogEntity>;
  private currentGameLogEntity: GameLogEntity;

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

  public startGameLog(mode: string): Observable<GameLogEntity> {
    return this.createGameLog(mode).pipe(
      tap((gameLogEntity) => this.currentGameLogEntity = gameLogEntity)
    );
  }

  public getCurrentGameLog(): Observable<GameLogEntity> {
    return this.currentGameLogEntity ? of(this.currentGameLogEntity) : throwError(`No game log started`);
  }

  public incrementCorrect(lastStartTime?: Date) {
    return this.updateCurrentGameLogEntity((gameLogEntity) => {
      gameLogEntity.countCorrect++;
      gameLogEntity.countTotal++;
    }, lastStartTime);
  }

  public incrementWrong(lastStartTime?: Date): Observable<GameLogEntity> {
    return this.updateCurrentGameLogEntity((gameLogEntity) => {
      gameLogEntity.countWrong++;
      gameLogEntity.countTotal++;
    }, lastStartTime);
  }

  public finishGameLog() {
    return this.updateCurrentGameLogEntity().pipe(
      tap((gameLogEntity) => this.currentGameLogEntity = null)
    );
  }

  private updateCurrentGameLogEntity(
    updateGameLogEntityFunction?: (gameLogEntity: GameLogEntity) => void,
    lastStartTime?: Date
  ): Observable<GameLogEntity> {
    if (!this.currentGameLogEntity) {
      return throwError(`No game log started`);
    }

    if (updateGameLogEntityFunction) {
      updateGameLogEntityFunction(this.currentGameLogEntity);
    }

    return this.updateGameLog(this.currentGameLogEntity, lastStartTime).pipe(
      tap((gameLogEntity) => this.currentGameLogEntity = gameLogEntity)
    );
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

  public updateGameLog(gameLogEntity: GameLogEntity, lastStartTime?: Date): Observable<GameLogEntity> {
    const now = new Date();
    lastStartTime = lastStartTime || gameLogEntity.startTime;
    gameLogEntity.endTime = now;
    gameLogEntity.durationInMillis = gameLogEntity.endTime.getTime() - lastStartTime.getTime();
    return this.db.putEntity(gameLogEntity).pipe(
      catchError((error) => {
        console.error(error);
        return throwError(error);
      })
    );
  }
}
