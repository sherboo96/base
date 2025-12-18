import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DigitalLibraryService, DigitalLibraryItem } from '../../../services/digital-library.service';
import { CourseTabService, CourseTab } from '../../../services/course-tab.service';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../services/translation.service';
import { ChangeDetectorRef } from '@angular/core';
import { AttachmentService } from '../../../services/attachment.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DialogService } from '@ngneat/dialog';
import { DigitalLibraryFormComponent } from './digital-library-form/digital-library-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
    selector: 'app-digital-library-management',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
    templateUrl: './digital-library-management.component.html',
    styleUrls: ['./digital-library-management.component.css']
})
export class DigitalLibraryManagementComponent implements OnInit, OnDestroy {
    routeCode: string = '';
    courseTabId: number | null = null;
    items: DigitalLibraryItem[] = [];
    isLoading: boolean = false;
    courseTab: CourseTab | null = null;
    searchTerm: string = '';
    currentPage: number = 1;
    pageSize: number = 20;
    totalPages: number = 1;
    totalItems: number = 0;
    Math = Math;
    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private digitalLibraryService: DigitalLibraryService,
        private courseTabService: CourseTabService,
        public loadingService: LoadingService,
        private toastr: ToastrService,
        private translationService: TranslationService,
        private cdr: ChangeDetectorRef,
        private attachmentService: AttachmentService,
        private dialogService: DialogService
    ) { }

    ngOnInit(): void {
        const paramsSub = this.route.params.subscribe(params => {
            this.routeCode = params['routeCode'] || '';
            if (this.routeCode) {
                this.loadCourseTabAndItems();
            } else {
                this.loadItems();
            }
        });
        this.subscriptions.push(paramsSub);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    loadCourseTabAndItems(): void {
        this.isLoading = true;
        const sub = this.courseTabService.getCourseTabByRouteCode(this.routeCode).subscribe({
            next: (response: any) => {
                const tab = response.result || response;
                if (tab) {
                    this.courseTabId = tab.id;
                    this.courseTab = tab;
                    this.loadItems();
                } else {
                    this.toastr.error(this.translationService.instant('digitalLibrary.courseTabNotFound'));
                    this.items = [];
                    this.totalItems = 0;
                    this.totalPages = 1;
                    this.isLoading = false;
                }
            },
            error: (err) => {
                console.error('Error loading course tab:', err);
                this.toastr.error(this.translationService.instant('digitalLibrary.courseTabNotFound'));
                this.items = [];
                this.totalItems = 0;
                this.totalPages = 1;
                this.isLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadItems(): void {
        if (!this.courseTabId && this.routeCode) return;

        this.isLoading = true;
        this.loadingService.show();

        const sub = this.digitalLibraryService.getAllItems(this.currentPage, this.pageSize, this.courseTabId || undefined)
            .pipe(
                finalize(() => {
                    this.isLoading = false;
                    this.loadingService.hide();
                })
            )
            .subscribe({
                next: (response) => {
                    // Filter items based on search term
                    let allItems = response.result || [];
                    
                    if (this.searchTerm) {
                        const searchLower = this.searchTerm.toLowerCase();
                        allItems = allItems.filter((item: DigitalLibraryItem) =>
                            item.name?.toLowerCase().includes(searchLower) ||
                            item.nameAr?.toLowerCase().includes(searchLower) ||
                            item.description?.toLowerCase().includes(searchLower)
                        );
                    }

                    this.totalItems = response.pagination?.total || allItems.length;
                    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
                    this.items = allItems;
                    
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('Error loading management items:', error);
                    this.toastr.error(
                        error.error?.message || this.translationService.instant('digitalLibrary.fetchError')
                    );
                    this.items = [];
                    this.totalItems = 0;
                    this.totalPages = 1;
                }
            });
        this.subscriptions.push(sub);
    }

    onSearch(): void {
        this.currentPage = 1;
        this.loadItems();
    }

    onPageSizeChange(): void {
        this.currentPage = 1;
        this.loadItems();
    }

    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadItems();
        }
    }

    getPageNumbers(): number[] {
        const maxVisiblePages = 5;
        const pages: number[] = [];
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    }

    getPosterUrl(posterPath: string | undefined): string {
        if (!posterPath) return '';
        return this.attachmentService.getFileUrl(posterPath);
    }

    addNewItem(): void {
        const dialogRef = this.dialogService.open(DigitalLibraryFormComponent, {
            data: { courseTabId: this.courseTabId },
            width: '90vw',
            maxWidth: '800px',
        });

        dialogRef.afterClosed$.subscribe((result) => {
            if (result) {
                this.loadItems();
            }
        });
    }

    editItem(item: DigitalLibraryItem): void {
        const dialogRef = this.dialogService.open(DigitalLibraryFormComponent, {
            data: { item: item, courseTabId: this.courseTabId },
            width: '90vw',
            maxWidth: '800px',
        });

        dialogRef.afterClosed$.subscribe((result) => {
            if (result) {
                this.loadItems();
            }
        });
    }

    deleteItem(item: DigitalLibraryItem): void {
        const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
            data: {
                title: this.translationService.instant('digitalLibrary.deleteItem'),
                message: this.translationService.instant('digitalLibrary.deleteItemConfirmation', { name: item.name }),
            },
        });

        dialogRef.afterClosed$.subscribe((result) => {
            if (result) {
                this.loadingService.show();
                this.digitalLibraryService.deleteItem(item.id).subscribe({
                    next: () => {
                        this.toastr.success(this.translationService.instant('digitalLibrary.deleteSuccess'));
                        this.loadingService.hide();
                        this.loadItems();
                    },
                    error: (error) => {
                        this.toastr.error(
                            error.error?.message || this.translationService.instant('digitalLibrary.deleteError')
                        );
                        this.loadingService.hide();
                    },
                });
            }
        });
    }

    viewItemDetails(item: DigitalLibraryItem): void {
        this.router.navigate(['/management/digital-library', this.routeCode, 'item', item.id]);
    }

    hasActiveFilters(): boolean {
        return !!this.searchTerm;
    }

    clearFilters(): void {
        this.searchTerm = '';
        this.currentPage = 1;
        this.loadItems();
    }
}
