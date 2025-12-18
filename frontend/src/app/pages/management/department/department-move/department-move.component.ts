import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { DepartmentService } from '../../../../services/department.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-department-move',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './department-move.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class DepartmentMoveComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  allDepartments: any[] = [];
  filteredDepartments: any[] = [];
  selectedDepartment: any = null;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ department: any }>,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      destinationCode: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadAllDepartments();
    
    // Watch for code input changes
    this.form.get('destinationCode')?.valueChanges.subscribe(code => {
      if (code) {
        this.searchDepartment(code);
      } else {
        this.filteredDepartments = [];
        this.selectedDepartment = null;
      }
    });
  }

  loadAllDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (response: any) => {
        const departments = response.result || response || [];
        this.allDepartments = departments.filter((d: any) => 
          !d.isDeleted && d.id !== this.dialogRef.data?.department?.id
        );
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('department.fetchError')
        );
      }
    });
  }

  searchDepartment(code: string): void {
    if (!code || code.trim() === '') {
      this.filteredDepartments = [];
      this.selectedDepartment = null;
      return;
    }

    const codeLower = code.toLowerCase().trim();
    this.filteredDepartments = this.allDepartments.filter((dept: any) => {
      const deptCode = (dept.code || '').toLowerCase();
      const deptNameEn = (dept.nameEn || '').toLowerCase();
      const deptNameAr = (dept.nameAr || '').toLowerCase();
      
      return deptCode.includes(codeLower) || 
             deptNameEn.includes(codeLower) || 
             deptNameAr.includes(codeLower);
    });

    // Auto-select if exact code match
    if (this.filteredDepartments.length === 1) {
      this.selectedDepartment = this.filteredDepartments[0];
    } else {
      this.selectedDepartment = null;
    }
  }

  selectDepartment(department: any): void {
    this.selectedDepartment = department;
    this.form.patchValue({ destinationCode: department.code || department.nameEn });
    this.filteredDepartments = [];
  }

  onSubmit(): void {
    if (this.form.invalid || !this.selectedDepartment) {
      if (!this.selectedDepartment) {
        this.toastr.warning(this.translationService.instant('department.selectDestination'));
      }
      return;
    }

    this.isSubmitting = true;
    const department = this.dialogRef.data?.department;
    
    if (!department) {
      this.toastr.error(this.translationService.instant('department.departmentNotFound'));
      this.isSubmitting = false;
      return;
    }

    // Prevent moving to itself
    if (this.selectedDepartment.id === department.id) {
      this.toastr.warning(this.translationService.instant('department.cannotMoveToSelf'));
      this.isSubmitting = false;
      return;
    }

    // Close dialog and return the selected department
    this.dialogRef.close(this.selectedDepartment);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  get currentDepartment() {
    return this.dialogRef.data?.department;
  }
}

