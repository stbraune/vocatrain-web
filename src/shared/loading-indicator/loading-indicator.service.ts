import { Injectable } from '@angular/core';

import { ReplaySubject } from 'rxjs';

@Injectable()
export class LoadingIndicatorService {
  private loadingStack = 0;
  public startedLoading = new ReplaySubject<number>();
  public finishedLoading = new ReplaySubject<number>();

  public isLoading(): boolean {
    return this.loadingStack > 0;
  }

  public notifyLoading() {
    this.loadingStack ++;
    if (this.loadingStack === 1) {
      this.startedLoading.next(this.loadingStack);
    }
  }

  public notifyFinished() {
    if (this.loadingStack > 0) {
      this.loadingStack --;
    }

    if (this.loadingStack === 0) {
      this.finishedLoading.next(this.loadingStack);
    }
  }
}
