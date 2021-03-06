import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../../modal/modal.service';
import { faTimesCircle, faSearch, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { PlannerService } from '../../../calendar/planner.service';
import { Plan, CAMPUSES } from '../../../calendar/calendar';
import { Subscription, combineLatest } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';


declare let gtag: Function;

@Component({
  selector: 'app-planning',
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.css']
})
export class PlanningComponent implements OnInit, OnDestroy {
  public subscription: Subscription;
  public plan: Plan;
  public campus = 'STLUC';
  public searches = [];
  public campuses = CAMPUSES;

  faTimesCircle = faTimesCircle;
  faSearch = faSearch;
  faCircleNotch = faCircleNotch;

  constructor(
      public plannerService: PlannerService,
      public modalService: ModalService,
      public toaster: ToastrService) {
    this.subscription = plannerService.currentPlan.asObservable().subscribe(
      (plan: Plan) => {
        this.plan = plan;
    });

    window.onbeforeunload = (e) => {
      if (this.plan.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave the app?';
      }
    };
  }

  ngOnInit() { }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  public handleTitleChanged(event: Event): void {
    const target = event.target as HTMLInputElement;
    const name = target.value;

    if (name === '' || name === undefined || name === null) {
      return;
    }

    this.plannerService.changeName(name);
  }

  public removeClass(className: string): void {
    this.plannerService.removeClass(className);
  }

  public onSearched(searchTerm: string): string {
    searchTerm = searchTerm.replace(' ', '').toUpperCase();

    const campus = CAMPUSES.find(c => c.code === this.campus);
    if (!campus) {
      this.toaster.error(`Couldn't find ${this.campus}, `, '', {
        positionClass: 'toast-bottom-center',
        toastClass: 'toast errorToast ngx-toastr',
        closeButton: false
      });
      return;
    }

    const status = this.plannerService.addClass(searchTerm, campus);
    this.searches.push(status);

    status.subscribe(
      (next) => {},
      (error) => {
        this.searches.splice(this.searches.find(s => s === status));
        this.toaster.error(`Couldn't find ${searchTerm}`, '', {
          positionClass: 'toast-bottom-center',
          toastClass: 'toast errorToast ngx-toastr',
          closeButton: false
        });
      },
      () => {
        this.searches.splice(this.searches.find(s => s === status));

        if (gtag && environment.gaEventParams) {
          gtag('event', 'addClass', {
            ...environment.gaEventParams,
            course_code: searchTerm
          });
        }
      }
    );

    return '';
  }

  public onClassCloseClicked(className: string): void {
    this.removeClass(className);
    this.plan.isDirty = true;
  }

  public searching(): boolean {
    return this.searches.length !== 0;
  }

  public setCampus(event: Event) {
    const target = event.target as HTMLInputElement;
    this.campus = target.value;
  }
}
