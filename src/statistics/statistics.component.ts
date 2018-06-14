import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { TranslateService } from '@ngx-translate/core';
import { ColorHelper } from '@swimlane/ngx-charts';

import { concat, forkJoin, throwError, from } from 'rxjs';
import { tap, switchMap, catchError, map } from 'rxjs/operators';

import { GameLogEntity, LoadingIndicatorService, startLoading, finishLoading, observeLoading } from '../shared';
import { StatisticsService } from './statistics.service';

declare interface WordsPerLevel {
  // lang
  key: string;
  value: {
    // level
    name: string,
    // amount
    value: number
  }[];
}

declare interface WordsPerDay {
  // mode
  key: string;
  value: {
    // date
    name: string,
    series: {
      // correct/wrong/total
      name: string,
      // amount
      value: number
    }[]
  }[];
}

declare interface Totals {
  key: [string, Date | string];
  value: {
    durationInMillis: number,
    countCorrect: number
    countWrong: number
    countTotal: number
  };
}

@Component({
  selector: 'statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  public modes: string[] = [];
  public stats: {
    [mode: string]: {
      overall?: Totals[],
      last30?: Totals[],
      wordsPerLevels?: WordsPerLevel[],
      wordsPerDays?: WordsPerDay[]
    }
  } = {};

  public constructor(
    private loadingIndicatorService: LoadingIndicatorService,
    private translateService: TranslateService,
    private statisticsService: StatisticsService
  ) {
  }

  public ngOnInit(): void {
    this.statisticsService.queryAllGameModes().pipe(
      startLoading(),
      tap((modes) => this.modes = modes),
      tap((modes) => modes.forEach((mode) => this.stats[mode] = {
        overall: [],
        last30: [],
        wordsPerDays: [],
        wordsPerLevels: []
      })),
      finishLoading()
    ).subscribe((modes) => {
      concat(...modes.map((mode) => this.loadStatistics(mode).pipe(observeLoading()))).subscribe();
    });
  }

  private loadStatistics(mode: string) {
    return forkJoin(
      this.loadTotals(mode),
      this.loadLast30DaysTotals(mode),
      this.loadTotalsPerDay(mode),
      this.loadWordsPerLevel(mode),
    );
  }

  private loadTotals(mode: string) {
    return this.statisticsService.getTotals({ mode: mode }).pipe(
      tap((result) => this.stats[mode].overall.push(...result))
    );
  }

  private loadLast30DaysTotals(mode: string) {
    const now = new Date();
    const then = new Date(now);
    then.setDate(then.getDate() - 30);
    return this.statisticsService.getTotals({ mode: mode, startDate: then, endDate: now }).pipe(
      tap((result) => this.stats[mode].last30.push(...result))
    );
  }

  private loadWordsPerLevel(mode: string) {
    return this.statisticsService.queryWordsPerLevel({ mode: mode }).pipe(
      switchMap((result) => this.translateService.get('statistics.level').pipe(map((level) => ([level, result])))),
      tap(([level, result]) => this.stats[mode].wordsPerLevels.push(...result.rows
        .map((row) => ({
          key: row.key[0],
          value: [
            {
              name: level + row.key[1],
              value: row.value
            }
          ]
        }))
        .reduce((prev, cur) => {
          const index = prev.findIndex((x) => x.key === cur.key);
          if (index !== -1) {
            prev[index].value.push(...cur.value);
          } else {
            prev.push(cur);
          }
          return prev;
        }, <WordsPerLevel[]>[])))
    );
  }

  private loadTotalsPerDay(mode: string) {
    const now = new Date();
    now.setUTCMilliseconds(0);
    now.setUTCSeconds(0);
    now.setUTCMinutes(0);
    now.setUTCHours(0);
    const then = new Date(now);
    then.setDate(then.getDate() - 7);

    return forkJoin(
      this.translateService.get(['statistics.date-format', 'statistics.correct', 'statistics.wrong', 'statistics.total']),
      this.statisticsService.getTotalsPerDay({ mode: mode, startDate: then, endDate: now })
    ).pipe(
      tap(([texts, result]) => {
        const dateFormatString = texts['statistics.date-format'];
        const correct = texts['statistics.correct'];
        const wrong = texts['statistics.wrong'];
        const total = texts['statistics.total'];
        this.stats[mode].wordsPerDays.push(...result
          .map((r) => ({
            key: r.key[0],
            value: [
              {
                name: this.formatDateShort(new Date(<string>r.key[1]), dateFormatString)
                  + ` (${Math.round(r.value.durationInMillis / 60000)}m)`,
                series: [
                  {
                    name: correct,
                    value: r.value.countCorrect
                  },
                  {
                    name: wrong,
                    value: r.value.countWrong
                  }
                ]
              }
            ]
          }))
          .reduce((prev, cur) => {
            const index = prev.findIndex((x) => x.key === cur.key);
            if (index !== -1) {
              prev[index].value.push(...cur.value);
            } else {
              prev.push(cur);
            }
            return prev;
          }, <WordsPerDay[]>[])
        );
      })
    );
  }

  public percent(a, b) {
    return Math.round(a * 10000 / b) / 100;
  }

  public formatDateShort(date: Date, dateFormatString: string): string {
    return new DatePipe(this.translateService.currentLang).transform(date, dateFormatString);
  }

  public formatDuration(start: Date, end: Date): string {
    return this.formatSeconds(((+end) - (+start)) / 1000);
  }

  public formatMinutes(minutes: number): string {
    return this.formatSeconds(minutes * 60);
  }

  public formatSeconds(seconds: number): string {
    const h = this.parseInt(seconds / 3600);
    const m = this.parseInt((seconds % 3600) / 60);
    const s = this.parseInt(seconds % 60);

    const hs = h > 9 ? h : '0' + h;
    const ms = m > 9 ? m : '0' + m;
    const ss = s > 9 ? s : '0' + s;

    if (h === 0) {
      return ms + ':' + ss;
    }

    return hs + ':' + ms + ':' + ss;
  }

  private parseInt(n: any): number {
    return parseInt(<string>n, 10);
  }
}
