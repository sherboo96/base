import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EventSpeakerService, EventSpeaker } from '../../../../services/event-speaker.service';
import { EventService } from '../../../../services/event.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-event-speaker-form',
  templateUrl: './event-speaker-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class EventSpeakerFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  events: any[] = [];

  constructor(
    private fb: FormBuilder,
    private eventSpeakerService: EventSpeakerService,
    private eventService: EventService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ speaker?: EventSpeaker }>,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      nameAr: [''],
      bioEn: [''],
      bioAr: [''],
      from: [''],
      eventId: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.dialogRef.data?.speaker) {
      this.isEdit = true;
      const speaker = this.dialogRef.data.speaker;
      this.form.patchValue({
        name: speaker.name || '',
        nameAr: speaker.nameAr || '',
        bioEn: speaker.bioEn || '',
        bioAr: speaker.bioAr || '',
        from: speaker.from || '',
        eventId: speaker.eventId || null,
      });
    }
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getAll(1, 1000).subscribe({
      next: (response) => {
        if (response.result) {
          this.events = response.result;
        }
      },
      error: () => {
        // Silently fail
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('common.formInvalid'));
      return;
    }

    this.isSubmitting = true;

    const formData: EventSpeaker = this.form.value;

    if (this.isEdit && this.dialogRef.data?.speaker?.id) {
      this.eventSpeakerService.update(this.dialogRef.data.speaker.id, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('common.success'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.eventSpeakerService.create(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('common.success'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

