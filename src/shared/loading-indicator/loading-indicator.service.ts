import { Injectable } from '@angular/core';

import { ReplaySubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

let loadingIndicatorService: LoadingIndicatorService;

export function startLoading() {
  if (loadingIndicatorService) {
    return loadingIndicatorService.startLoading();
  }

  console.warn('LoadingIndicatorService was never initialized. Maybe missed injecting it somewhere?');
  return <T>(source: Observable<T>) => {
    return source;
  };
}

export function finishLoading() {
  if (loadingIndicatorService) {
    return loadingIndicatorService.finishLoading();
  }

  console.warn('LoadingIndicatorService was never initialized. Maybe missed injecting it somewhere?');
  return <T>(source: Observable<T>) => {
    return source;
  };
}

export function observeLoading() {
  if (loadingIndicatorService) {
    return loadingIndicatorService.observeLoading();
  }

  console.warn('LoadingIndicatorService was never initialized. Maybe missed injecting it somewhere?');
  return <T>(source: Observable<T>) => {
    return source;
  };
}

@Injectable()
export class LoadingIndicatorService {
  private loadingStack = 0;
  public startedLoading = new ReplaySubject<number>();
  public finishedLoading = new ReplaySubject<number>();

  public constructor() {
    loadingIndicatorService = this;
  }

  public isLoading(): boolean {
    return this.loadingStack > 0;
  }

  public startLoading() {
    this.notifyLoading();
    return <T>(source: Observable<T>) => {
      return source;
    };
  }

  public finishLoading() {
    return <T>(source: Observable<T>) => {
      return source.pipe(
        tap((x) => this.notifyFinished(), (e) => this.notifyFinished())
      );
    };
  }

  public observeLoading() {
    return <T>(source: Observable<T>) => {
      return source.pipe(
        this.startLoading(),
        this.finishLoading()
      );
    };
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
