import { Injectable } from '@angular/core';

import { Observable, throwError, pipe, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { GameLogEntity } from './game-log.entity';
import { DatabaseService, Database } from '../database';

// declare const emit: any;
declare const sum: any;

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

  public getAverageDurationPerWord(mode: string) {
    // https://www.slideshare.net/okurow/couchdb-mapreduce-13321353
    // ?group_level=1 -> gruppiert nach modus
    // ?group_level=2 -> gruppiert nach modus und tag (alternativ: ?group=true)
    // ? -> gesamt, ueber alle modi und alle tage reduziert
    // ?startkey=["guess", "2018-05-20"]&endkey=["guess", "2018-05-20\uffff"] -> zwischen angegeben bereichen
    this.db.executeQuery<
      [string, Date | string],
      { durationInMillis: number, countTotal: number },
      { durationInMillis: number, countTotal: number }
    >({
        designDocument: 'game-log-stats',
        viewName: 'average-duration-per-word',
        mapFunction(doc, emit) {
          function normalizeDate(d: Date) {
            return new Date(d.getTime()
              - (d.getUTCHours() * 60 * 60 * 1000)
              - (d.getUTCMinutes() * 60 * 1000)
              - (d.getUTCSeconds() * 1000)
              - (d.getUTCMilliseconds()));
          }

          if (doc._id.substr(0, 'game-log_'.length) === 'game-log_') {
            emit(
              [
                doc.mode,
                normalizeDate(new Date(doc.startTime))
              ], {
                durationInMillis: doc.durationInMillis,
                countTotal: doc.countTotal
              });
          }
        },
        reduceFunction(keys, values, rereduce) {
          return {
            durationInMillis: sum(values.map(function (value) {
              return value.durationInMillis;
            })),
            countTotal: sum(values.map(function (value) {
              return value.countTotal;
            }))
          };
        }
      }).subscribe((x) => {
      });
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
