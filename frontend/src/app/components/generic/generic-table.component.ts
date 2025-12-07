// generic-table.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-left table-auto border-collapse">
        <thead class="bg-gray-50">
          <tr>
            <th
              *ngFor="let column of columns"
              class="p-4 text-sm font-medium text-gray-600 border-b border-gray-200"
            >
              {{ column.header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let row of data"
            class="border-b last:border-0 hover:bg-gray-50 transition-colors"
          >
            <td
              *ngFor="let column of columns"
              class="p-4 text-sm text-gray-600"
              [ngClass]="column.class"
            >
              <ng-container *ngIf="!column.template; else customTemplate">
                {{ column.accessor(row) }}
              </ng-container>
              <ng-template #customTemplate>
                <ng-container
                  *ngTemplateOutlet="
                    column.template;
                    context: { $implicit: row }
                  "
                ></ng-container>
              </ng-template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class GenericTableComponent {
  @Input() columns: {
    header: string;
    accessor: (row: any) => any;
    template?: any;
    class?: string;
  }[] = [];
  @Input() data: any[] = [];
}
