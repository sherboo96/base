import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestService } from '../../../services/request.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { ReplyModalComponent } from './reply-modal/reply-modal.component';

interface ActivityStatus {
  nameAr: string;
  nameEn: string;
  id: number;
  isDeleted: boolean;
  createdOn: string;
}

interface RequestDetails {
  transID: string;
  transDate: string;
  requesterCivilID: string;
  requesterName: string;
  licN_CentralNumber: string;
  licN_CivilID: string;
  licN_CommNumber: string;
  licN_TypeID: number;
  licN_TypeDesc: string;
  commBookNumber: string;
  companyName: string;
  addressAutoNumber: string;
  address: string;
  email: string;
  phoneNumber: string;
  statusId: number;
  requestOperations: Array<{
    operation: {
      nameAr: string;
      nameEn: string;
      mociCode: number;
      id: number;
      isDeleted: boolean;
      createdOn: string;
    };
  }>;
  activities: Array<{
    requestId: number;
    code: string;
    name: string;
    description: string;
    operationId: number;
    statusId: number;
    status: {
      nameAr: string;
      nameEn: string;
      id: number;
      isDeleted: boolean;
      createdOn: string;
    };
    id: number;
    isDeleted: boolean;
    createdOn: string;
    updatedAt?: string;
  }>;
  id: number;
  isDeleted: boolean;
  createdOn: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-request-details',
  standalone: true,
  imports: [CommonModule, LoadingComponent, ReplyModalComponent],
  templateUrl: './request-details.component.html',
})
export class RequestDetailsComponent implements OnInit {
  request: RequestDetails | null = null;
  isLoading = false;
  activityStatuses: ActivityStatus[] = [];
  showDropdown: { [key: number]: boolean } = {};
  currentActivityId: number | null = null;
  clickPosition: { x: number; y: number } = { x: 0, y: 0 };
  showReplyModal = false;
  replyNotes = `بشرط عدم شراء منتجات الكيماويات الصناعية من شركة صناعة الكيماويات البترولية واعادة بيعها.
بشرط إلا يشمل النقل أسطوانات الغاز وملحقاتها ( منظمات الغاز) بجميع أنواعها وأحجامها وأشكالها.

نشاط مخازن المواد الكيماويه بشرط تقديم قائمه بالمواد التي تريد تخزينها 
تصدير المواد الكيماويه ، بشرط لا يتعارض مع القرار الوزاري رقم 4 لعام 1989 بشأن منع استيراد أو تصدير النفط الخام أو أي منتج من المنتجات البترولية أو البتروكيماوية، وبشرط ألا تندرج تلك المواد أو المنتجات ضمن التصنيفات المبينة في القرار الوزاري رقم 75 لعام 2015 الصادر عن هيئة تشجيع الاستثمار المباشر، مثل منتجات أفران الكوك والأسمدة والمركبات الأزوتية.

ويجدر التنويه الاتي :
شريطه تتقيد الشركة في حال ممارسه أنشطها بضرورة الالتزام بشرط التأهيل المسبق الخاص بنشاط خدمات نقل وتحريك منصات الحفر المطبقة في شركه نفط الكويت والقطاع النفطي.
السماح بممارسة أي نشاط من الأنشطة أو عدم ممانعة وزارة النفط ومؤسسة البترول الكويتية في ذلك لا ينشئ أي التزام أو قيد من أي نوع على وزارة النفط ومؤسسة البترول الكويتية وشركاتها النفطية التابعة لها بالتعامل مع الشركات أو الأشخاص المرخص لها من قبل الجهات المختصة لدى الدولة بممارسة أي نشاط أو إبرام أية عقود معها.

إن ممارسة أي نشاط من الأنشطة التي صدر بشأنها موافقة وزارة النفط ومؤسسة البترول الكويتية تقتضي الحصول على التراخيص والتصاريح والموافقات اللازمة من جهات الاختصاص سواء بالدولة أو بالقطاع النفطي، وذلك قبل الشروع في مزاولة النشاط، كما أن بعض الأنشطة تستدعي للقيام بها بعض الاشتراطات الخاصة بالتأهيل الفني لقبولها بقوائم التأهيل المعنية لدى شركات القطاع النفطي، ووفقاً للإجراءات والنظم السارية بشأن التأهيل والتصنيف لديها.

عدم ممانعة وزارة النفط ومؤسسة البترول الكويتية في ممارسة بعض الأنشطة المرتبطة بالأغراض الموافق عليها لا تمثل في ذاتها وبمجردها أي وعد، أو تعهد أو التزام أو ارتباط من أي نوع كان على القطاع النفطي الحكومي -المتمثل في المؤسسة وشركاتها النفطية التابعة تجاه التعاقد أو التعامل بأي شكل من الأشكال مع الشركة المرخص لها، ذلك أن مثل هذا التعاقد أو التعامل يخضع للوائح والنظم والقواعد والإجراءات المتبعة والمطبقة في ذلك القطاع، وفي إطار مبدأ حرية التعاقد إذ لا يجوز إجبار طرف أو شخص على إبرام أي عقد دون توفر إرادته الواعية لذلك.

أن الموافقـة تقتـصر فقط على الغرض المذكور أعلاه تحديداً وتفصيلاً وحصريا دون ما عداه من اغراض أخري.
أن ممارسة النشاط المرتبط بالغرض المذكور أعلاه يقتضي الحصول على التراخيص و التصريح و الموافقة اللازمة من جهات الإختصاص سواء بالدولة أو بالقطاع النفطي وذلك قبل الشروع بممارسة النشاط.
أن عدم ممانعة وزارة النفط ومؤسسة البترول الكويتية في ممارسة النشاط المرتبط بالغرض الذي تتم الموافقة عليه، لا تمثل في حد ذاتها أي التزام على وزارة النفط ومؤسسة البترول الكويتية وشركاتها التابعة تجاه التعامل مع الشركة الطالبة، ذلك أن مثل هذا التعامل يخضع للوائح والنظم والقواعد و الإجراءات المتبعة و المطبقة في هذه الجهات.
أن هذه الموافقة لا تغني عن الحصول على الموافقة من الجهات المعنية الأخرى كما أنها لا تغني عن الرجوع للوزارة للحصول على موافقتها عند طلب الشركة ادخال أي تعديلات على تلك النشاط و الأعمال بعد التراخيص بمزاولتها.

أن الموافقـة تقتـصر فقط على الاغراض المذكورة أعلاه تحديداً وتفصيلاً وحصريا دون ما عداه من اغراض أخري.
أن ممارسة الأنشطة المرتبطة بالأغراض المذكورة أعلاه يقتضي الحصول على التراخيص و التصريح و الموافقة اللازمة من جهات الاختصاص سواء بالدولة أو بالقطاع النفطي وذلك قبل الشروع بممارسة النشاط.
أن عدم ممانعة وزارة النفط ومؤسسة البترول الكويتية في ممارسة الأنشطة المرتبطة بالاغراض الذي تتم الموافقة عليه، لا تمثل في حد ذاتها أي التزام على وزارة النفط ومؤسسة البترول الكويتية وشركاتها التابعة تجاه التعامل مع الشركة الطالبة، ذلك أن مثل هذا التعامل يخضع للوائح والنظم والقواعد و الإجراءات المتبعة و المطبقة في هذه الجهات.
أن هذه الموافقة لا تغني عن الحصول على الموافقة من الجهات المعنية الأخرى كما أنها لا تغني عن الرجوع للوزارة للحصول على موافقتها عند طلب الشركة ادخال أي تعديلات على تلك النشاط و الأعمال بعد التراخيص بمزاولتها`;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private requestService: RequestService,
    private toastr: ToastrService,
    public loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadRequestDetails();
    this.loadActivityStatuses();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.dropdown-trigger') &&
      !target.closest('.dropdown-content')
    ) {
      this.closeAllDropdowns();
    }
  }

  loadActivityStatuses(): void {
    this.requestService.getActivityStatuses().subscribe({
      next: (response) => {
        if (response && response.result) {
          this.activityStatuses = response.result;
        }
      },
      error: (error) => {
        console.error('Error loading activity statuses:', error);
        this.toastr.error('Failed to load activity statuses');
      },
    });
  }

  loadRequestDetails(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Loading request details for ID:', id);

    if (!id) {
      this.toastr.error('Invalid request ID');
      this.router.navigate(['/request']);
      return;
    }

    this.isLoading = true;
    this.loadingService.show();

    this.requestService.getRequestDetails(+id).subscribe({
      next: (response) => {
        console.log('Request details response:', response);
        if (response && response.result) {
          this.request = response.result;
        } else {
          this.toastr.error('No data received');
          this.router.navigate(['/request']);
        }
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading request details:', error);
        this.toastr.error(
          error.error?.message || 'Failed to load request details'
        );
        this.isLoading = false;
        this.loadingService.hide();
        this.router.navigate(['/request']);
      },
    });
  }

  toggleDropdown(activityId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.currentActivityId = activityId;
    this.clickPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    this.showDropdown[activityId] = true;
  }

  closeAllDropdowns(): void {
    this.showDropdown = {};
    this.currentActivityId = null;
  }

  getCurrentActivityId(): number {
    return this.currentActivityId || 0;
  }

  getCurrentActivityStatusId(): number {
    return (
      this.request?.activities?.find(
        (a) => a.id === this.getCurrentActivityId()
      )?.statusId || 0
    );
  }

  getDropdownPosition(): { x: number; y: number } {
    return this.clickPosition;
  }

  updateActivityStatus(activityId: number, statusId: number): void {
    this.loadingService.show();
    this.requestService.updateActivityStatus(activityId, statusId).subscribe({
      next: () => {
        this.toastr.success('Activity status updated successfully');
        this.loadRequestDetails();
        this.closeAllDropdowns();
      },
      error: (error) => {
        console.error('Error updating activity status:', error);
        this.toastr.error('Failed to update activity status');
        this.loadingService.hide();
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusText(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'مسودة';
      case 2:
        return 'تحت الدراسة';
      case 1002:
        return 'تم الاعتماد';
      default:
        return 'غير معروف';
    }
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'bg-yellow-100 text-yellow-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 1002:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  openReplyModal(): void {
    this.showReplyModal = true;
  }

  closeReplyModal(): void {
    this.showReplyModal = false;
  }

  submitReply(): void {
    if (!this.request?.id) {
      this.toastr.error('Invalid request ID');
      return;
    }

    this.loadingService.show();
    this.requestService
      .updateApproval(this.request.id, this.replyNotes)
      .subscribe({
        next: () => {
          this.toastr.success('Reply submitted successfully');
          this.closeReplyModal();
          this.loadRequestDetails(); // Refresh the request details
        },
        error: (error) => {
          console.error('Error submitting reply:', error);
          this.toastr.error(error.error?.message || 'Failed to submit reply');
          this.loadingService.hide();
        },
        complete: () => {
          this.loadingService.hide();
        },
      });
  }
}
