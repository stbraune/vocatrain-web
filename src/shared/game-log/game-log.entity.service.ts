import { Injectable } from '@angular/core';

import { Observable, throwError, pipe, of, forkJoin } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';

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
      deserializeItem: (gameLogEntity) => {
        gameLogEntity.startTime = gameLogEntity.startTime && new Date(gameLogEntity.startTime);
        gameLogEntity.endTime = gameLogEntity.endTime && new Date(gameLogEntity.endTime);
        return gameLogEntity;
      }
    });

    // this.db.executeQuery<number>({
    //   designDocument: 'game-logs',
    //   viewName: 'with-nothing',
    //   mapFunction(emit) {
    //     return `function(doc) {
    //       if (doc._id.substr(0, 'game-log_'.length) === 'game-log_') {
    //         if (doc.countTotal < 5) {
    //           emit(doc.countTotal);
    //         }
    //       }
    //     }`;
    //   },
    //   include_docs: true
    // }).pipe(
    //   switchMap((result) => forkJoin(result.rows.map((row) => this.db.removeEntity(row.doc))))
    // ).subscribe();
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

  public pingGameLog(gameLogEntity: GameLogEntity, durationReferenceDate: Date) {
    const now = new Date();
    durationReferenceDate = durationReferenceDate || gameLogEntity.startTime;
    gameLogEntity.endTime = now;
    gameLogEntity.durationInMillis += gameLogEntity.endTime.getTime() - durationReferenceDate.getTime();
  }

  public updateGameLog(gameLogEntity: GameLogEntity, durationReferenceDate: Date): Observable<GameLogEntity> {
    return this.db.putEntity(gameLogEntity).pipe(
      catchError((error) => {
        console.error(error);
        return throwError(error);
      })
    );
  }
}
