import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialogState = new BehaviorSubject<{
    isOpen: boolean;
    component: any;
    data: any;
  }>({
    isOpen: false,
    component: null,
    data: null,
  });

  dialogState$ = this.dialogState.asObservable();

  openDialog(component: any, data?: any): void {
    this.dialogState.next({
      isOpen: true,
      component,
      data,
    });
  }

  closeDialog(result?: any): void {
    this.dialogState.next({
      isOpen: false,
      component: null,
      data: null,
    });
  }

  showSuccess(message: string): void {
    // Implement success notification
    console.log('Success:', message);
  }

  showError(message: string): void {
    // Implement error notification
    console.error('Error:', message);
  }
}
