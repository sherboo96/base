import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PositionService } from '../../../../services/position.service';
import { DepartmentService } from '../../../../services/department.service';
import { DialogService } from '../../../../services/dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Department } from '../../../../services/department.service';

@Component({
  selector: 'app-position-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './position-form.component.html',
})
export class PositionFormComponent implements OnInit {
  form: FormGroup;
  departments: Department[] = [];
  isSubmitting = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private positionService: PositionService,
    private departmentService: DepartmentService,
    private dialogService: DialogService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      departmentId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getDepartments(1, 100).subscribe({
      next: (response) => {
        this.departments = response.result;
      },
      error: (error) => {
        this.toastr.error(error.error.message || 'Failed to load departments');
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.positionService.createPosition(this.form.value).subscribe({
      next: () => {
        this.toastr.success('Position added successfully');
        this.dialogService.closeDialog();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.toastr.error(error.error.message || 'Failed to add position');
      },
    });
  }

  onCancel(): void {
    this.dialogService.closeDialog();
  }
}
