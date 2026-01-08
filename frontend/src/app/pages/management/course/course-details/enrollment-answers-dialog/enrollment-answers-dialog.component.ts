import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CourseEnrollment } from '../../../../../services/enrollment.service';
import { CourseQuestion, QuestionType } from '../../../../../services/course-question.service';
import { TranslationService } from '../../../../../services/translation.service';

@Component({
  selector: 'app-enrollment-answers-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white rounded-xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-accent/10 to-accent/5 border-b border-gray-200 px-6 py-5">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white rounded-xl shadow-md border border-accent/20">
            <i class="fas fa-question-circle text-accent text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-2xl font-bold text-gray-900 font-poppins mb-1">
              {{ 'course.enrollmentQuestionAnswers' | translate }}
            </h3>
            <p class="text-sm text-gray-600 font-poppins">
              {{ 'course.enrollmentAnswersDescription' | translate }}
            </p>
          </div>
        </div>
      </div>

      <div class="px-6 py-5">

      <!-- User Info -->
      <div *ngIf="enrollment && enrollment.user" class="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accentDark flex items-center justify-center text-white font-bold text-lg shadow-md">
            {{ (enrollment.user.fullName || '').charAt(0) || 'U' }}
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ enrollment.user.fullName || 'Unknown User' }}</p>
            <p class="text-xs text-gray-500">{{ enrollment.user.email || '' }}</p>
          </div>
        </div>
      </div>

      <!-- Answers List -->
      <div *ngIf="answerEntries && answerEntries.length > 0" class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <div *ngFor="let answerEntry of answerEntries; let i = index" 
          class="p-5 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accentDark text-white flex items-center justify-center text-sm font-bold shadow-md">
                {{ i + 1 }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <!-- Question Text -->
              <h4 class="text-base font-bold text-gray-900 mb-4 leading-snug">
                {{ getQuestionText(answerEntry.key) }}
              </h4>
              

              <!-- Answer -->
              <div class="mt-2">
                <span *ngIf="isYesNoAnswerType(answerEntry.key)" 
                  class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
                  [class.bg-gradient-to-r]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'yes'"
                  [class.from-green-500]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'yes'"
                  [class.to-green-600]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'yes'"
                  [class.text-white]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'yes'"
                  [class.bg-gradient-to-r]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'no'"
                  [class.from-red-500]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'no'"
                  [class.to-red-600]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'no'"
                  [class.text-white]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'no'">
                  <i class="fas text-base" 
                    [class.fa-check-circle]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'yes'"
                    [class.fa-times-circle]="formatAnswer(answerEntry.value, answerEntry.key).toLowerCase() === 'no'"></i>
                  {{ formatAnswer(answerEntry.value, answerEntry.key) }}
                </span>
                <div *ngIf="!isYesNoAnswerType(answerEntry.key)" 
                  class="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-sm">
                  <p class="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{{ answerEntry.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Answers Message -->
      <div *ngIf="!answerEntries || answerEntries.length === 0" 
        class="text-center py-8 text-gray-500">
        <i class="fas fa-inbox text-4xl mb-3 opacity-50"></i>
        <p class="text-sm">{{ 'course.noAnswersAvailable' | translate }}</p>
      </div>

      </div>

      <!-- Footer -->
      <div class="bg-gray-50 border-t border-gray-200 px-6 py-5 flex justify-end">
        <button
          (click)="dialogRef.close()"
          class="px-8 py-3 bg-gradient-to-r from-accent to-accentDark hover:from-accentDark hover:to-accent text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-sm font-poppins transform hover:scale-105"
        >
          {{ 'common.close' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-height: 90vh;
      overflow: hidden;
    }
    
    .overflow-y-auto::-webkit-scrollbar {
      width: 8px;
    }
    
    .overflow-y-auto::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #c9ae81;
      border-radius: 10px;
    }
    
    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: #b89a6e;
    }
  `]
})
export class EnrollmentAnswersDialogComponent {
  enrollment: CourseEnrollment;
  courseQuestions: CourseQuestion[] = [];
  answerEntries: Array<{ key: string; value: string }> = [];
  currentLanguage: 'en' | 'ar' = 'en';
  QuestionType = QuestionType;

  constructor(
    public dialogRef: DialogRef<{ 
      enrollment: CourseEnrollment; 
      courseQuestions: CourseQuestion[] 
    }>,
    private translationService: TranslationService
  ) {
    this.enrollment = this.dialogRef.data.enrollment;
    this.courseQuestions = this.dialogRef.data.courseQuestions || [];
    this.currentLanguage = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    
    // Subscribe to language changes
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLanguage = lang as 'en' | 'ar';
    });

    // Parse and prepare answer entries
    this.loadAnswers();
  }

  loadAnswers(): void {
    if (!this.enrollment || !this.enrollment.questionAnswers) {
      this.answerEntries = [];
      return;
    }

    try {
      const answers = JSON.parse(this.enrollment.questionAnswers);
      this.answerEntries = Object.keys(answers).map(key => ({
        key,
        value: answers[key]
      }));
    } catch (error) {
      console.error('Error parsing question answers:', error);
      this.answerEntries = [];
    }
  }

  getQuestionText(questionId: string): string {
    const question = this.courseQuestions.find(q => q.id?.toString() === questionId);
    if (!question) return questionId;
    return this.currentLanguage === 'ar' && question.questionAr ? question.questionAr : question.question;
  }

  getQuestionType(questionId: string): QuestionType | string | number | null {
    const question = this.courseQuestions.find(q => q.id?.toString() === questionId);
    if (!question) return null;
    
    // If type is already a string from API, return it as-is
    if (typeof question.type === 'string') {
      return question.type;
    }
    
    // Otherwise return the numeric enum value
    return question.type;
  }

  isYesNoAnswerType(questionId: string): boolean {
    const questionType = this.getQuestionType(questionId);
    if (!questionType) return false;
    
    // Handle string enum values from API
    if (typeof questionType === 'string') {
      return questionType === 'YesNo' || questionType.toLowerCase() === 'yesno';
    }
    
    // Handle numeric enum values
    const typeValue = Number(questionType);
    return typeValue === Number(QuestionType.YesNo);
  }

  formatAnswer(answer: string, questionId: string): string {
    const questionType = this.getQuestionType(questionId);
    if (!questionType) return answer;
    
    // Handle string enum values from API
    if (typeof questionType === 'string') {
      if (questionType === 'YesNo' || questionType.toLowerCase() === 'yesno') {
        return answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase();
      }
      return answer;
    }
    
    // Handle numeric enum values
    const typeValue = Number(questionType);
    if (typeValue === Number(QuestionType.YesNo)) {
      // Capitalize first letter
      return answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase();
    }
    return answer;
  }
}

