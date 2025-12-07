import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  private timeoutId: any = null;

  constructor() {}

  /**
   * Show the loading indicator
   */
  show(): void {
    this.clearTimeout();
    this.isLoadingSubject.next(true);
  }

  /**
   * Hide the loading indicator
   */
  hide(): void {
    this.clearTimeout();
    this.isLoadingSubject.next(false);
  }

  /**
   * Show loading for a specific duration
   * @param ms Duration in milliseconds
   */
  showForDuration(ms: number = 1000): void {
    this.show();
    this.timeoutId = setTimeout(() => {
      this.hide();
    }, ms);
  }

  /**
   * Show loading until a promise is resolved
   * @param promise The promise to wait for
   */
  async showUntilComplete<T>(promise: Promise<T>): Promise<T> {
    try {
      this.show();
      return await promise;
    } finally {
      this.hide();
    }
  }

  /**
   * Clear any active timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
