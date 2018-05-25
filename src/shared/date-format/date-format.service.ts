import { Injectable } from '@angular/core';

@Injectable()
export class DateFormatService {
  public formatDuration(start: Date, end: Date): string {
    return this.formatSeconds(((+end) - (+start)) / 1000);
  }

  public formatMinutes(minutes: number): string {
    return this.formatSeconds(minutes * 60);
  }

  public formatMillis(millis: number): string {
    return this.formatSeconds(millis / 1000);
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
