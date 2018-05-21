import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { TranslateService } from '@ngx-translate/core';
import { ColorHelper } from '@swimlane/ngx-charts';

import { GameLogEntity } from '../shared';
import { StatisticsService } from './statistics.service';

declare interface WordsPerLevel {
  // [mode, lang]
  key: [string, string];
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

@Component({
  selector: 'statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  public totalsOverall: {
    key: [string, Date | string],
    value: {
      durationInMillis: number,
      countCorrect: number
      countWrong: number
      countTotal: number
    }
  }[] = [];

  public totalsLast30: {
    key: [string, Date | string],
    value: {
      durationInMillis: number,
      countCorrect: number
      countWrong: number
      countTotal: number
    }
  }[] = [];

  public wordsPerLevels: WordsPerLevel[] = [];

  public wordsPerDays: WordsPerDay[] = [];

  public constructor(
    private translateService: TranslateService,
    private statisticsService: StatisticsService
  ) {
  }

  public ngOnInit(): void {
    const now = new Date();
    const then = new Date(now);
    then.setDate(then.getDate() - 30);

    this.statisticsService.getTotals({ mode: 'guess' }).subscribe((result) => {
      this.totalsOverall.push(...result);
    }, (error) => {
      console.error(error);
    });

    this.statisticsService.getTotals({ mode: 'guess', startDate: then, endDate: now }).subscribe((result) => {
      this.totalsLast30.push(...result);
    }, (error) => {
      console.error(error);
    });

    this.translateService.get('statistics.level').subscribe((level) => {
      this.statisticsService.queryWordsPerLevel({ mode: 'guess' }).subscribe((result) => {
        this.wordsPerLevels.push(...result.rows
          .map((row) => ({
            key: <[string, string]>[row.key[0], row.key[1]],
            value: [
              {
                name: level + row.key[2],
                value: row.value
              }
            ]
          }))
          .reduce((prev, cur) => {
            const index = prev.findIndex((x) => x.key[0] === cur.key[0] && x.key[1] === cur.key[1]);
            if (index !== -1) {
              prev[index].value.push(...cur.value);
            } else {
              prev.push(cur);
            }
            return prev;
          }, <WordsPerLevel[]>[]));
      }, (error) => {
        console.error(error);
      });
    });

    this.translateService.get(['statistics.date-format', 'statistics.correct', 'statistics.wrong', 'statistics.total'])
      .subscribe((texts) => {
        const dateFormatString = texts['statistics.date-format'];
        const correct = texts['statistics.correct'];
        const wrong = texts['statistics.wrong'];
        const total = texts['statistics.total'];
        this.statisticsService.getTotalsPerDay({ mode: 'guess', startDate: then, endDate: now }).subscribe((result) => {
          this.wordsPerDays.push(...result
            .map((r) => ({
              key: r.key[0],
              value: [
                {
                  name: this.formatDateShort(new Date(<string>r.key[1]), dateFormatString),
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
        }, (error) => {
          console.error(error);
        });
      });
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
