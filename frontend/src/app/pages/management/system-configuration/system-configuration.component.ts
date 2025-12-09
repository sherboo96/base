import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SystemConfigurationService, SystemConfiguration } from '../../../services/system-configuration.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';
import { DialogService } from '@ngneat/dialog';
import { SystemConfigurationFormComponent } from './system-configuration-form/system-configuration-form.component';

@Component({
  selector: 'app-system-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './system-configuration.component.html',
  styleUrl: './system-configuration.component.scss',
})
export class SystemConfigurationComponent implements OnInit {
  configurations: SystemConfiguration[] = [];
  searchTerm = '';
  filteredConfigurations: SystemConfiguration[] = [];

  constructor(
    private configService: SystemConfigurationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private translationService: TranslationService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadConfigurations();
  }

  loadConfigurations(): void {
    this.loadingService.show();
    this.configService.getAll().subscribe({
      next: (response) => {
        this.configurations = (response.result || []).map((config: SystemConfiguration) => ({
          ...config,
          value: this.maskPassword(config.key, config.value)
        }));
        this.filteredConfigurations = [...this.configurations];
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading configurations:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('systemConfig.fetchError')
        );
        this.loadingService.hide();
      },
    });
  }

  maskPassword(key: string, value: string): string {
    // Mask password fields
    if (key.toLowerCase().includes('password') && value && value.length > 0) {
      if (value.length <= 4) {
        return '*'.repeat(value.length);
      }
      // Show first 4 chars and mask the rest: Pass********rd
      const firstPart = value.substring(0, 4);
      const lastPart = value.length > 8 ? value.substring(value.length - 2) : '';
      const maskedLength = value.length - 4 - (lastPart.length > 0 ? lastPart.length : 0);
      return firstPart + '*'.repeat(Math.max(maskedLength, 8)) + lastPart;
    }
    return value;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredConfigurations = [...this.configurations];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredConfigurations = this.configurations.filter(
      (config) =>
        config.key.toLowerCase().includes(term) ||
        config.value.toLowerCase().includes(term) ||
        (config.description && config.description.toLowerCase().includes(term))
    );
  }

  editConfiguration(config: SystemConfiguration): void {
    const dialogRef = this.dialogService.open(SystemConfigurationFormComponent, {
      data: { configuration: config },
      width: '600px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadConfigurations();
      }
    });
  }

  addConfiguration(): void {
    const dialogRef = this.dialogService.open(SystemConfigurationFormComponent, {
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
        this.loadConfigurations();
      }
    });
  }
}
