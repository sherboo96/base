import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PublicService, Public } from '../../../services/public.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';
import { DialogService } from '@ngneat/dialog';
import { PublicFormComponent } from './public-form/public-form.component';
import { SupportInfoFormComponent } from './support-info-form/support-info-form.component';

@Component({
  selector: 'app-public',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './public.component.html',
  styleUrl: './public.component.scss',
})
export class PublicComponent implements OnInit {
  publics: Public[] = [];
  searchTerm = '';
  filteredPublics: Public[] = [];

  constructor(
    private publicService: PublicService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private translationService: TranslationService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadPublics();
  }

  loadPublics(): void {
    this.loadingService.show();
    this.publicService.getAll().subscribe({
      next: (response) => {
        this.publics = response.result || [];
        this.filteredPublics = [...this.publics];
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading public configurations:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('public.fetchError')
        );
        this.loadingService.hide();
      },
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPublics = [...this.publics];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredPublics = this.publics.filter(
      (publicData) =>
        publicData.key.toLowerCase().includes(term) ||
        publicData.value.toLowerCase().includes(term) ||
        (publicData.description && publicData.description.toLowerCase().includes(term))
    );
  }

  editPublic(publicData: Public): void {
    // Special handling for support_info
    if (publicData.key === 'support_info') {
      this.editSupportInfo();
      return;
    }

    const dialogRef = this.dialogService.open(PublicFormComponent, {
      data: { publicData },
      width: '600px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload data to display updated API response
        this.loadPublics();
      }
    });
  }

  editSupportInfo(): void {
    const dialogRef = this.dialogService.open(SupportInfoFormComponent, {
      width: '600px',
      height: '90vh',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload data to display updated API response
        this.loadPublics();
      }
    });
  }

  addPublic(): void {
    const dialogRef = this.dialogService.open(PublicFormComponent, {
      data: {},
      width: '600px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload data to display updated API response
        this.loadPublics();
      }
    });
  }

  deletePublic(publicData: Public): void {
    if (confirm(this.translationService.instant('public.confirmDelete'))) {
      this.loadingService.show();
      this.publicService.delete(publicData.key).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('public.deleteSuccess'));
          this.loadingService.hide();
          this.loadPublics();
        },
        error: (error) => {
          this.toastr.error(error.error?.message || this.translationService.instant('public.deleteError'));
          this.loadingService.hide();
        },
      });
    }
  }
}

