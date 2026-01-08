import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CourseQuestion {
  id?: number;
  courseId: number;
  question: string;
  questionAr?: string;
  description?: string;
  descriptionAr?: string;
  type: QuestionType | string | number; // Allow string for API responses with JsonStringEnumConverter
  isRequired: boolean;
  order: number;
}

export enum QuestionType {
  YesNo = 1,
  ShortAnswer = 2
}

export interface CourseQuestionResponse {
  statusCode: number;
  message: string;
  result: CourseQuestion | CourseQuestion[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class CourseQuestionService {
  private apiUrl = `${environment.baseUrl}/CourseQuestions`;

  constructor(private http: HttpClient) {}

  getByCourseId(courseId: number): Observable<CourseQuestionResponse> {
    return this.http.get<CourseQuestionResponse>(`${this.apiUrl}/course/${courseId}`);
  }

  getById(id: number): Observable<CourseQuestionResponse> {
    return this.http.get<CourseQuestionResponse>(`${this.apiUrl}/${id}`);
  }

  create(question: Partial<CourseQuestion>): Observable<CourseQuestionResponse> {
    return this.http.post<CourseQuestionResponse>(this.apiUrl, question);
  }

  update(id: number, question: Partial<CourseQuestion>): Observable<CourseQuestionResponse> {
    return this.http.put<CourseQuestionResponse>(`${this.apiUrl}/${id}`, question);
  }

  delete(id: number): Observable<CourseQuestionResponse> {
    return this.http.delete<CourseQuestionResponse>(`${this.apiUrl}/${id}`);
  }

  reorder(questionIds: number[]): Observable<CourseQuestionResponse> {
    return this.http.post<CourseQuestionResponse>(`${this.apiUrl}/reorder`, { questionIds });
  }
}

