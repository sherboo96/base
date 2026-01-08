import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { CourseQuestion } from '../../../../services/course-question.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-course-question-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './course-question-form.component.html',
})
export class CourseQuestionFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  questionTypes = [
    { value: 'shortanswer', label: 'course.questionTypeShortAnswer' },
    { value: 'yesno', label: 'course.questionTypeYesNo' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ question?: CourseQuestion; isEdit?: boolean }>,
    private toastr: ToastrService,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      question: ['', Validators.required],
      questionAr: [''],
      type: ['shortanswer', Validators.required],
      required: [true]
    });
    this.isEdit = this.dialogRef.data?.isEdit || false;
  }

  ngOnInit(): void {
    if (this.isEdit && this.dialogRef.data?.question) {
      const question = this.dialogRef.data.question;
      // The question object passed from editQuestion already has type as 'yesno' or 'shortanswer'
      // But handle both cases: if it's a number (enum from backend) or string (from form)
      let typeValue = 'shortanswer';
      if (question.type !== undefined && question.type !== null) {
        if (typeof question.type === 'number') {
          // Backend enum: 1 = YesNo, 2 = ShortAnswer
          typeValue = question.type === 1 ? 'yesno' : 'shortanswer';
        } else if (typeof question.type === 'string') {
          // Already converted string
          typeValue = question.type;
        }
      }
      
      this.form.patchValue({
        question: question.question || '',
        questionAr: question.questionAr || '',
        type: typeValue,
        // Use isRequired from the typed CourseQuestion model; default to true if missing
        required: question.isRequired !== undefined ? question.isRequired : true
      });
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.toastr.error(this.translationService.instant('course.questionFormInvalid'));
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

