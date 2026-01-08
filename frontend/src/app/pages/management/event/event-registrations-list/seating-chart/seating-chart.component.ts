import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DialogService } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { SearchableSelectComponent } from '../../../../../components/searchable-select/searchable-select.component';
import { EventRegistrationService, EventRegistration } from '../../../../../services/event-registration.service';
import { LoadingService } from '../../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../../services/translation.service';
import { EventRegistrationManualFormComponent } from '../event-registration-manual-form/event-registration-manual-form.component';
import { SelectRegistrationDialogComponent } from './select-registration-dialog/select-registration-dialog.component';

interface Seat {
  row: string;
  number: number;
  id: string; // e.g., "A-1", "B-5"
  x: number;
  y: number;
  occupied: boolean;
  registrationId?: number;
  registrationName?: string;
  registrationJobTitle?: string;
}

@Component({
  selector: 'app-seating-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="p-6 max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="mb-6 border-b border-gray-200 pb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-accent/10 rounded-lg">
              <i class="fas fa-chair text-accent text-xl"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold text-textDark font-poppins">
                {{ 'eventRegistration.seatingChart' | translate }}
              </h3>
              <p class="text-sm text-gray-600 mt-1 font-poppins">
                {{ 'eventRegistration.seatingChartDescription' | translate }}
              </p>
            </div>
          </div>
          
        </div>
      </div>

      <!-- Seating Chart SVG -->
      <div class="flex-1 overflow-auto border-2 border-gray-200 rounded-lg bg-white p-4">
        <svg
          [attr.width]="svgWidth"
          [attr.height]="svgHeight"
          class="w-full h-full"
          style="min-width: 100%; min-height: 600px;"
        >
          <!-- Seats -->
          <g *ngFor="let seat of seats" 
             [class.cursor-pointer]="!seat.occupied"
             [class.cursor-not-allowed]="seat.occupied"
             (click)="onSeatClick(seat)"
             [title]="getSeatTooltip(seat)">
            <!-- Chair Icon - Backrest Frame (Rounded Top) -->
            <path
              d="M -9 -10 Q -9 -12 -7 -12 L 7 -12 Q 9 -12 9 -10 L 9 -4 L -9 -4 Z"
              [attr.fill]="getSeatColor(seat)"
              [attr.stroke]="getSeatStroke(seat)"
              stroke-width="1.5"
              [attr.transform]="'translate(' + seat.x + ',' + seat.y + ')'"
            />
            <!-- Chair Icon - Backrest Slat 1 (Left) -->
            <rect
              [attr.x]="seat.x - 7"
              [attr.y]="seat.y - 10"
              width="2"
              height="6"
              rx="1"
              [attr.fill]="getSeatTextColor(seat)"
            />
            <!-- Chair Icon - Backrest Slat 2 (Center) -->
            <rect
              [attr.x]="seat.x - 1"
              [attr.y]="seat.y - 10"
              width="2"
              height="6"
              rx="1"
              [attr.fill]="getSeatTextColor(seat)"
            />
            <!-- Chair Icon - Backrest Slat 3 (Right) -->
            <rect
              [attr.x]="seat.x + 5"
              [attr.y]="seat.y - 10"
              width="2"
              height="6"
              rx="1"
              [attr.fill]="getSeatTextColor(seat)"
            />
            <!-- Chair Icon - Seat (Rounded Rectangle) -->
            <rect
              [attr.x]="seat.x - 9"
              [attr.y]="seat.y - 3"
              width="18"
              height="6"
              rx="2"
              [attr.fill]="getSeatColor(seat)"
              [attr.stroke]="getSeatStroke(seat)"
              stroke-width="1.5"
            />
            <!-- Chair Icon - Left Leg (Rounded) -->
            <rect
              [attr.x]="seat.x - 7"
              [attr.y]="seat.y + 3"
              width="3"
              height="5"
              rx="1.5"
              [attr.fill]="getSeatColor(seat)"
            />
            <!-- Chair Icon - Right Leg (Rounded) -->
            <rect
              [attr.x]="seat.x + 4"
              [attr.y]="seat.y + 3"
              width="3"
              height="5"
              rx="1.5"
              [attr.fill]="getSeatColor(seat)"
            />
            <!-- Seat Number -->
            <text
              [attr.x]="seat.x"
              [attr.y]="seat.y + 2"
              text-anchor="middle"
              dominant-baseline="middle"
              class="text-xs font-semibold"
              fill="#FFFFFF"
              font-size="9"
              font-weight="700"
            >
              {{ seat.number }}
            </text>
          </g>

          <!-- Row Labels -->
          <text
            *ngFor="let rowLabel of rowLabels"
            [attr.x]="rowLabel.x"
            [attr.y]="rowLabel.y"
            text-anchor="middle"
            dominant-baseline="middle"
            class="font-bold text-gray-700"
            fill="#000000"
            font-size="14"
            font-weight="bold"
          >
            {{ rowLabel.label }}
          </text>

          <!-- Screen at Bottom -->
          <rect
            [attr.x]="screenX"
            [attr.y]="screenY"
            [attr.width]="screenWidth"
            [attr.height]="screenHeight"
            fill="#9CA3AF"
            stroke="#6B7280"
            stroke-width="2"
            rx="4"
          />
          <text
            [attr.x]="screenX + screenWidth / 2"
            [attr.y]="screenY + screenHeight / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            class="text-white font-bold text-lg"
            fill="#374151"
            font-weight="bold"
            font-size="18"
          >
            SCREEN
          </text>
        </svg>
      </div>

      <!-- Selected Seat Info -->
      <div *ngIf="selectedSeat" class="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900 font-poppins">
                {{ 'eventRegistration.selectedSeat' | translate }}: <span class="text-accent">{{ selectedSeat.id }}</span>
              </p>
              <p *ngIf="selectedSeat.occupied" class="text-xs text-gray-600 mt-1 font-poppins">
                {{ 'eventRegistration.occupiedBy' | translate }}: {{ selectedSeat.registrationName }}
                <span *ngIf="selectedSeat.registrationJobTitle" class="text-gray-500">
                  - {{ selectedSeat.registrationJobTitle }}
                </span>
              </p>
            </div>
            <button
              *ngIf="selectedSeat.occupied"
              (click)="removeSeatAssignment()"
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm font-poppins"
            >
              {{ 'eventRegistration.removeAssignment' | translate }}
            </button>
          </div>
          <div *ngIf="!selectedSeat.occupied" class="space-y-2">
            <p class="text-xs text-gray-500 font-poppins italic">
              {{ 'eventRegistration.clickToSelectRegistration' | translate }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class SeatingChartComponent implements OnInit {
  eventId: number;
  seats: Seat[] = [];
  registrations: EventRegistration[] = [];
  availableRegistrations: EventRegistration[] = [];
  selectedSeat: Seat | null = null;
  svgWidth = 1200;
  svgHeight = 800;
  screenX = 50;
  screenY = 0; // Will be calculated at bottom
  screenWidth = 1100; // Updated to match new SVG width minus margins
  screenHeight = 40;
  rowLabels: Array<{ label: string; x: number; y: number; side: 'left' | 'right' }> = [];

  // Seating configuration - can be made configurable later
  // Rows sorted from S (top) to A (bottom)
  private readonly rows = ['S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  private readonly seatsPerRow = {
    'S': { left: [], middle: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], right: [] },
    'R': { left: [], middle: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], right: [] },
    'Q': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23] },
    'P': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23] },
    'O': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23] },
    'N': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23] },
    'M': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23] },
    'L': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23] },
    'K': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22] },
    'J': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22] },
    'I': { left: [1, 2, 3, 4], middle: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22] },
    'H': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23, 24] },
    'G': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], right: [20, 21, 22, 23, 24] },
    'F': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22, 23] },
    'E': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22, 23] },
    'D': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22, 23] },
    'C': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], right: [19, 20, 21, 22, 23] },
    'B': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], right: [18, 19, 20, 21, 22] },
    'A': { left: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], right: [18, 19, 20, 21, 22] }
  };

  constructor(
    public dialogRef: DialogRef<{ eventId: number }>,
    private eventRegistrationService: EventRegistrationService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef
  ) {
    this.eventId = this.dialogRef.data.eventId;
  }

  ngOnInit(): void {
    this.loadRegistrations();
    this.generateSeats();
  }

  loadRegistrations(): void {
    this.loadingService.show();
    this.eventRegistrationService.getAll(1, 1000, undefined, this.eventId).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.registrations = Array.isArray(response.result) ? response.result : [response.result];
          this.updateSeatOccupancy();
        }
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading registrations:', error);
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  generateSeats(): void {
    this.seats = [];
    this.rowLabels = [];
    
    const rowHeight = 40;
    const topMargin = 20;
    const leftBlockX = 100;
    const seatSpacing = 35; // Consistent spacing between each individual seat (same for all seats)
    const gapBetweenBlocks = seatSpacing; // Use same spacing for gaps between blocks
    const leftLabelX = 40;
    const rightLabelX = 1160; // Updated to match new SVG width
    const screenMargin = 20;

    // Calculate total height needed for seats
    const totalSeatsHeight = this.rows.length * rowHeight;
    
    // Screen at bottom
    this.screenY = totalSeatsHeight + topMargin + screenMargin;
    const startY = topMargin;

    // Generate seats from top (S) to bottom (A)
    this.rows.forEach((row, rowIndex) => {
      const y = startY + (rowIndex * rowHeight);
      const config = this.seatsPerRow[row as keyof typeof this.seatsPerRow];

      // For rows R and S, center all seats
      const isCenteredRow = row === 'R' || row === 'S';
      
      if (isCenteredRow) {
        // Combine all seats into middle block for centering
        const allSeats = [...config.left, ...config.middle, ...config.right];
        const totalWidth = (allSeats.length - 1) * seatSpacing;
        const centerX = this.svgWidth / 2;
        const startX = centerX - (totalWidth / 2);
        
        allSeats.forEach((seatNum, index) => {
          this.seats.push({
            row,
            number: seatNum,
            id: `${row}-${seatNum}`,
            x: startX + (index * seatSpacing),
            y,
            occupied: false
          });
        });
      } else {
        // Calculate positions with consistent spacing for other rows
        let currentX = leftBlockX;
        let seatIndex = 0;

        // Left block - consistent spacing
        config.left.forEach((seatNum) => {
          this.seats.push({
            row,
            number: seatNum,
            id: `${row}-${seatNum}`,
            x: currentX,
            y,
            occupied: false
          });
          currentX += seatSpacing;
          seatIndex++;
        });

        // Gap between left and middle blocks (same spacing)
        if (config.left.length > 0 && config.middle.length > 0) {
          currentX += gapBetweenBlocks;
        }

        // Middle block - consistent spacing (no extra gaps)
        config.middle.forEach((seatNum) => {
          this.seats.push({
            row,
            number: seatNum,
            id: `${row}-${seatNum}`,
            x: currentX,
            y,
            occupied: false
          });
          currentX += seatSpacing;
          seatIndex++;
        });

        // Gap between middle and right blocks (same spacing)
        if (config.middle.length > 0 && config.right.length > 0) {
          currentX += gapBetweenBlocks;
        }

        // Right block - consistent spacing
        config.right.forEach((seatNum) => {
          this.seats.push({
            row,
            number: seatNum,
            id: `${row}-${seatNum}`,
            x: currentX,
            y,
            occupied: false
          });
          currentX += seatSpacing;
          seatIndex++;
        });
      }

      // Add row labels on both sides
      this.rowLabels.push({
        label: row,
        x: leftLabelX,
        y: y + 4,
        side: 'left'
      });
      this.rowLabels.push({
        label: row,
        x: rightLabelX,
        y: y + 4,
        side: 'right'
      });
    });

    // Set SVG height to accommodate seats + screen + margins
    this.svgHeight = this.screenY + this.screenHeight + screenMargin;
  }

  updateSeatOccupancy(): void {
    this.seats.forEach(seat => {
      const registration = this.registrations.find(reg => reg.seatNumber === seat.id);
      if (registration) {
        seat.occupied = true;
        seat.registrationId = registration.id;
        seat.registrationName = registration.name;
        seat.registrationJobTitle = registration.jobTitle;
      } else {
        seat.occupied = false;
        seat.registrationId = undefined;
        seat.registrationName = undefined;
        seat.registrationJobTitle = undefined;
      }
    });
    
    // Update available registrations (those without seat assignments)
    this.availableRegistrations = this.registrations.filter(reg => !reg.seatNumber || reg.seatNumber.trim() === '');
  }

  getSeatColor(seat: Seat): string {
    if (seat.occupied) {
      return '#DC2626'; // Red for occupied
    }
    return '#10B981'; // Green for available
  }

  getSeatStroke(seat: Seat): string {
    if (seat.occupied) {
      return '#991B1B'; // Darker red border for occupied
    }
    return '#059669'; // Darker green border for available
  }

  getSeatTextColor(seat: Seat): string {
    // White text on both green and red backgrounds
    return '#FFFFFF';
  }

  getSeatTooltip(seat: Seat): string {
    if (seat.occupied) {
      return `${seat.id} - ${this.translationService.instant('eventRegistration.occupiedBy')}: ${seat.registrationName}`;
    }
    return `${seat.id} - ${this.translationService.instant('eventRegistration.availableSeat')}`;
  }

  onSeatClick(seat: Seat): void {
    this.selectedSeat = seat;
    this.cdr.detectChanges();
    
    // Auto-open dialog for available seats
    if (!seat.occupied) {
      // Small delay to ensure UI updates
      setTimeout(() => {
        this.openSelectRegistrationDialog();
      }, 100);
    }
  }

  openSelectRegistrationDialog(): void {
    if (!this.selectedSeat || this.selectedSeat.occupied) return;

    const dialogRef = this.dialogService.open(SelectRegistrationDialogComponent, {
      width: '600px',
      height: '600px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      data: {
        seatId: this.selectedSeat.id,
        registrations: this.availableRegistrations,
        onAssign: (registrationId: number) => {
          this.assignRegistrationToSeat(registrationId);
        }
      },
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Registration was assigned
        this.loadRegistrations();
      }
      // Clear selected seat when dialog closes
      this.selectedSeat = null;
      this.cdr.detectChanges();
    });
  }

  assignRegistrationToSeat(registrationId: number): void {
    if (!this.selectedSeat) return;
    
    // Check if this registration already has a seat assigned
    const registration = this.registrations.find(reg => reg.id === registrationId);
    if (registration && registration.seatNumber && registration.seatNumber.trim() !== '') {
      // Find which seat is currently assigned to this registration
      const currentSeat = this.seats.find(s => s.id === registration.seatNumber);
      if (currentSeat) {
        this.toastr.warning(
          this.translationService.instant('eventRegistration.userAlreadyHasSeat', {
            seat: registration.seatNumber,
            name: registration.name
          })
        );
        return;
      }
    }
    
    this.updateSeatNumber(registrationId, this.selectedSeat.id);
  }

  createNewRegistrationForSeat(): void {
    if (!this.selectedSeat) return;

    // Open dialog to create new registration
    const dialogRef = this.dialogService.open(EventRegistrationManualFormComponent, {
      data: { eventId: this.eventId },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // After manual registration is created, assign the seat
        this.loadRegistrations();
        // The seat assignment will be handled after registration is created
        // We need to update the registration with the seat number
        setTimeout(() => {
          this.assignSeatToLatestRegistration();
        }, 500);
      }
    });
  }

  assignSeatToLatestRegistration(): void {
    if (!this.selectedSeat) return;

    // Get the latest registration (the one just created)
    this.loadingService.show();
    this.eventRegistrationService.getAll(1, 1000, undefined, this.eventId).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          const allRegistrations = Array.isArray(response.result) ? response.result : [response.result];
          // Find registration without a seat number
          const registrationWithoutSeat = allRegistrations.find(reg => !reg.seatNumber || reg.seatNumber.trim() === '');
          
          if (registrationWithoutSeat && registrationWithoutSeat.id) {
            this.updateSeatNumber(registrationWithoutSeat.id, this.selectedSeat!.id);
          } else {
            this.toastr.warning(this.translationService.instant('eventRegistration.noRegistrationToAssign'));
            this.loadingService.hide();
          }
        }
      },
      error: (error) => {
        console.error('Error loading registrations:', error);
        this.loadingService.hide();
      }
    });
  }

  updateSeatNumber(registrationId: number, seatNumber: string | null): void {
    // Check if the seat is already occupied by another registration
    if (seatNumber) {
      const existingRegistration = this.registrations.find(reg => 
        reg.seatNumber === seatNumber && reg.id !== registrationId
      );
      if (existingRegistration) {
        this.toastr.warning(
          this.translationService.instant('eventRegistration.seatAlreadyOccupied', {
            seat: seatNumber,
            name: existingRegistration.name
          })
        );
        return;
      }
    }
    
    this.loadingService.show();
    this.eventRegistrationService.updateSeatNumber(registrationId, seatNumber).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          if (seatNumber) {
            this.toastr.success(this.translationService.instant('eventRegistration.seatAssignedSuccess'));
          } else {
            this.toastr.success(this.translationService.instant('eventRegistration.seatRemovedSuccess'));
          }
          this.loadRegistrations();
          this.selectedSeat = null;
        } else {
          this.toastr.error(response.message || this.translationService.instant('eventRegistration.seatAssignError'));
        }
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('eventRegistration.seatAssignError'));
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  removeSeatAssignment(): void {
    if (!this.selectedSeat || !this.selectedSeat.registrationId) return;

    this.loadingService.show();
    this.eventRegistrationService.updateSeatNumber(this.selectedSeat.registrationId, null).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.toastr.success(this.translationService.instant('eventRegistration.seatRemovedSuccess'));
          this.loadRegistrations();
          this.selectedSeat = null;
        } else {
          this.toastr.error(response.message || this.translationService.instant('eventRegistration.seatRemoveError'));
        }
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('eventRegistration.seatRemoveError'));
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }
}

