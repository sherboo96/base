import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SideMenuService {
  private collapsedSubject = new BehaviorSubject<boolean>(false);
  public collapsed$ = this.collapsedSubject.asObservable();

  constructor() {
    // Load saved state from localStorage
    const savedState = localStorage.getItem('sideMenuCollapsed');
    if (savedState !== null) {
      this.collapsedSubject.next(savedState === 'true');
    }
  }

  toggle(): void {
    const newState = !this.collapsedSubject.value;
    this.collapsedSubject.next(newState);
    localStorage.setItem('sideMenuCollapsed', String(newState));
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
    localStorage.setItem('sideMenuCollapsed', String(collapsed));
  }

  getCollapsed(): boolean {
    return this.collapsedSubject.value;
  }
}
