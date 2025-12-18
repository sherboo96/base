import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { JobTitleService, JobTitle } from '../../../../services/job-title.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { TranslationService } from '../../../../services/translation.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-department-job-titles',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './department-job-titles.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
    }
    
    .scroll-container {
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .scroll-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .scroll-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .scroll-container::-webkit-scrollbar-thumb {
      background: #9333ea;
      border-radius: 10px;
    }
    
    .scroll-container::-webkit-scrollbar-thumb:hover {
      background: #7e22ce;
    }
  `]
})
export class DepartmentJobTitlesComponent implements OnInit {
  jobTitles: JobTitle[] = [];
  isLoading = false;
  department: any = null;

  constructor(
    private jobTitleService: JobTitleService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef<{ department: any }>,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.department = this.dialogRef.data?.department;
  }

  ngOnInit(): void {
    if (this.department) {
      this.loadJobTitles();
    }
  }

  loadJobTitles(): void {
    if (!this.department?.id) {
      return;
    }

    this.isLoading = true;
    this.loadingService.show();

    this.jobTitleService
      .getJobTitles(1, 1000, this.department.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.jobTitles = response.result || [];
        },
        error: (error) => {
          console.error('Error loading job titles:', error);
          this.toastr.error(
            error.error?.message || this.translationService.instant('jobTitle.fetchError')
          );
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive
      ? this.translationService.instant('common.active')
      : this.translationService.instant('common.inactive');
  }
}

