import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CourseQuestion, QuestionType } from '../../../services/course-question.service';
import { TranslationService } from '../../../services/translation.service';

// Helper function to check if question is Yes/No type
function isYesNoQuestion(question: CourseQuestion): boolean {
  if (!question || question.type === undefined || question.type === null) {
    return false;
  }
  
  // Handle string enum values from API (e.g., "YesNo", "ShortAnswer")
  if (typeof question.type === 'string') {
    return question.type === 'YesNo' || question.type.toLowerCase() === 'yesno';
  }
  
  // Handle numeric enum values
  const typeValue = Number(question.type);
  return typeValue === Number(QuestionType.YesNo);
}

// Helper function to check if question is Short Answer type
function isShortAnswerQuestion(question: CourseQuestion): boolean {
  if (!question || question.type === undefined || question.type === null) {
    return false;
  }
  
  // Handle string enum values from API (e.g., "YesNo", "ShortAnswer")
  if (typeof question.type === 'string') {
    return question.type === 'ShortAnswer' || question.type.toLowerCase() === 'shortanswer';
  }
  
  // Handle numeric enum values
  const typeValue = Number(question.type);
  return typeValue === Number(QuestionType.ShortAnswer);
}

@Component({
  selector: 'app-enrollment-questions-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="dialog-content bg-white rounded-xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-accent/10 to-accent/5 border-b border-gray-200 px-6 py-5">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white rounded-xl shadow-md border border-accent/20">
            <i class="fas fa-question-circle text-accent text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-2xl font-bold text-gray-900 font-poppins mb-1">
              {{ 'course.enrollmentQuestions' | translate }}
            </h3>
            <p class="text-sm text-gray-600 font-poppins">
              {{ 'course.enrollmentQuestionsDescription' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- Scrollable Form Content -->
      <div class="form-scroll-container max-h-[60vh] overflow-y-auto px-6 py-5">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <div *ngFor="let question of sortedQuestions; let i = index" 
            class="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 space-y-4">
            <!-- Question Header -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accentDark text-white flex items-center justify-center text-sm font-bold shadow-md">
                  {{ i + 1 }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <label [for]="'question-' + question.id" 
                  class="block text-base font-bold text-gray-900 font-poppins mb-4 leading-snug">
                  {{ currentLanguage === 'ar' && question.questionAr ? question.questionAr : question.question }}
                  <span *ngIf="question.isRequired" class="text-red-500 ml-1.5 text-lg">*</span>
                </label>
                
                <!-- Yes/No Question -->
                <div *ngIf="isYesNoQuestion(question)" class="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    (click)="selectYesNo(question.id?.toString() || '', 'yes')"
                    [class.bg-gradient-to-r]="form.get(question.id?.toString() || '')?.value === 'yes'"
                    [class.from-green-500]="form.get(question.id?.toString() || '')?.value === 'yes'"
                    [class.to-green-600]="form.get(question.id?.toString() || '')?.value === 'yes'"
                    [class.text-white]="form.get(question.id?.toString() || '')?.value === 'yes'"
                    [class.shadow-md]="form.get(question.id?.toString() || '')?.value === 'yes'"
                    [class.bg-white]="form.get(question.id?.toString() || '')?.value !== 'yes'"
                    [class.text-green-700]="form.get(question.id?.toString() || '')?.value !== 'yes'"
                    [class.border-green-500]="form.get(question.id?.toString() || '')?.value !== 'yes'"
                    class="px-4 py-2 border-2 rounded-lg font-medium text-xs font-poppins transition-all duration-200 hover:shadow-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transform flex items-center gap-1.5"
                  >
                    <i class="fas fa-check-circle text-xs"></i>
                    {{ 'common.yes' | translate }}
                  </button>
                  <button
                    type="button"
                    (click)="selectYesNo(question.id?.toString() || '', 'no')"
                    [class.bg-gradient-to-r]="form.get(question.id?.toString() || '')?.value === 'no'"
                    [class.from-red-500]="form.get(question.id?.toString() || '')?.value === 'no'"
                    [class.to-red-600]="form.get(question.id?.toString() || '')?.value === 'no'"
                    [class.text-white]="form.get(question.id?.toString() || '')?.value === 'no'"
                    [class.shadow-md]="form.get(question.id?.toString() || '')?.value === 'no'"
                    [class.bg-white]="form.get(question.id?.toString() || '')?.value !== 'no'"
                    [class.text-red-700]="form.get(question.id?.toString() || '')?.value !== 'no'"
                    [class.border-red-500]="form.get(question.id?.toString() || '')?.value !== 'no'"
                    class="px-4 py-2 border-2 rounded-lg font-medium text-xs font-poppins transition-all duration-200 hover:shadow-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transform flex items-center gap-1.5"
                  >
                    <i class="fas fa-times-circle text-xs"></i>
                    {{ 'common.no' | translate }}
                  </button>
                  <!-- Hidden input for form validation -->
                  <input
                    type="hidden"
                    [formControlName]="question.id?.toString() || ''"
                    [required]="question.isRequired"
                  />
                </div>

                <!-- Short Answer Question -->
                <div *ngIf="isShortAnswerQuestion(question)" class="mt-4">
                  <textarea
                    [id]="'question-' + question.id"
                    [formControlName]="question.id?.toString() || ''"
                    rows="4"
                    class="w-full border-2 border-gray-300 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins shadow-sm focus:shadow-md resize-y min-h-[100px]"
                    [placeholder]="'course.enterAnswer' | translate"
                    [required]="question.isRequired"
                    [class.border-red-500]="form.get(question.id?.toString() || '')?.invalid && form.get(question.id?.toString() || '')?.touched"
                    [class.bg-red-50]="form.get(question.id?.toString() || '')?.invalid && form.get(question.id?.toString() || '')?.touched"
                  ></textarea>
                  <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span *ngIf="form.get(question.id?.toString() || '')?.value" class="flex items-center gap-1">
                      <i class="fas fa-check-circle text-green-500"></i>
                      {{ (form.get(question.id?.toString() || '')?.value?.length || 0) }} {{ 'course.characters' | translate }}
                    </span>
                    <span *ngIf="!form.get(question.id?.toString() || '')?.value" class="text-gray-400">
                      {{ 'course.typeYourAnswer' | translate }}
                    </span>
                  </div>
                </div>

                <!-- Validation Error -->
                <div *ngIf="form.get(question.id?.toString() || '')?.invalid && form.get(question.id?.toString() || '')?.touched" 
                  class="flex items-center gap-2 text-xs text-red-600 mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
                  <i class="fas fa-exclamation-circle"></i>
                  <span class="font-medium">{{ 'course.answerRequired' | translate }}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer Actions -->
      <div class="bg-gray-50 border-t border-gray-200 px-6 py-5">
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            (click)="onCancel()"
            class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-semibold text-sm font-poppins shadow-sm hover:shadow-md"
          >
            {{ 'common.cancel' | translate }}
          </button>
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="form.invalid || isSubmitting"
            class="px-8 py-3 bg-gradient-to-r from-accent to-accentDark hover:from-accentDark hover:to-accent text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg font-poppins transform hover:scale-105 disabled:hover:scale-100"
          >
            <span *ngIf="!isSubmitting" class="flex items-center gap-2">
              <i class="fas fa-check-circle"></i>
              {{ 'course.enroll' | translate }}
            </span>
            <span *ngIf="isSubmitting" class="flex items-center gap-2">
              <i class="fas fa-spinner fa-spin"></i>
              {{ 'common.processing' | translate }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-height: 90vh;
      overflow: hidden;
    }
    
    .form-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .form-scroll-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb {
      background: #c9ae81;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb:hover {
      background: #b89a6e;
    }
  `]
})
export class EnrollmentQuestionsDialogComponent implements OnInit {
  form: FormGroup;
  questions: CourseQuestion[] = [];
  sortedQuestions: CourseQuestion[] = [];
  isSubmitting = false;
  currentLanguage: 'en' | 'ar' = 'en';
  QuestionType = QuestionType;
  
  // Expose helper functions to template
  isYesNoQuestion = isYesNoQuestion;
  isShortAnswerQuestion = isShortAnswerQuestion;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ questions: CourseQuestion[] }>,
    private translationService: TranslationService
  ) {
    this.questions = this.dialogRef.data.questions || [];
    // Sort questions by order
    this.sortedQuestions = [...this.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
    this.currentLanguage = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    
    // Subscribe to language changes
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLanguage = lang as 'en' | 'ar';
    });

    // Build form with dynamic controls
    const formControls: { [key: string]: any } = {};
    this.sortedQuestions.forEach(question => {
      const questionId = question.id?.toString() || '';
      formControls[questionId] = question.isRequired 
        ? ['', Validators.required] 
        : [''];
    });
    this.form = this.fb.group(formControls);
  }

  ngOnInit(): void {
  }

  selectYesNo(questionId: string, value: 'yes' | 'no'): void {
    const control = this.form.get(questionId);
    if (control) {
      control.setValue(value);
      control.markAsTouched();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const answers: { [key: string]: string } = {};
    
    this.sortedQuestions.forEach(question => {
      const questionId = question.id?.toString() || '';
      const answer = this.form.get(questionId)?.value;
      if (answer) {
        answers[questionId] = answer;
      }
    });

    this.dialogRef.close(answers);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}

