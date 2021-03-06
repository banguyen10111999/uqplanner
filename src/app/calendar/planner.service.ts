import { ApiService } from '../api.service';
import { Injectable, isDevMode } from '@angular/core';
import { Plan, Plans, ClassListing, PlanSummary, ClassType, Campus } from './calendar';
import { Observable, BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { map } from 'rxjs/operators';
import * as uuid from "uuid";
import * as _ from "lodash";

@Injectable({
  providedIn: 'root'
})
export class PlannerService {

  public currentPlan: BehaviorSubject<Plan>;
  private plans: BehaviorSubject<Plans>;

  constructor(
    public apiService: ApiService,
    public storageService: StorageService
  ) {
    this.plans = new BehaviorSubject<Plans>(storageService.get());

    const planIds = Object.keys(this.plans.value);
    if (planIds.length === 0) {
      this.currentPlan = new BehaviorSubject<Plan>(this.cleanPlan());

      this.plans.next({
        [this.currentPlan.value.id]: this.currentPlan.value
      });
    } else {
      // TODO: get last edited plan
      this.currentPlan = new BehaviorSubject<Plan>(_.cloneDeep(this.plans.value[planIds[0]]));
    }
  }

  public newPlan() {
    const cleanPlan: Plan = this.cleanPlan();
    this.currentPlan.next(cleanPlan);

    this.plans.next({
      ...this.plans.value,
      [cleanPlan.id]: cleanPlan
    });
  }

  public savePlan() {
    const plan = this.currentPlan.value;
    if (!plan.name) {
      plan.name = this.defaultPlanName();
    }

    plan.isDirty = false;

    this.plans.next(
      {
        ...this.plans.value,
        [plan.id]: {
          ...plan,
          lastEdited: Date.now(),
        }
      }
    );
    this.storageService.save(this.plans.value);
  }

  public deletePlan() {
    // delete the plan
    const planId = this.currentPlan.value.id;
    const newPlans = {
      ...this.plans.value
    };

    delete newPlans[planId];

    this.plans.next(newPlans);

    // switch to previous plan
    const keys = Object.keys(this.plans.value);
    if (keys.length > 0) {
      this.setCurrentPlan(keys[0]);
    } else {
      this.newPlan();
    }

    // save
    this.storageService.save(this.plans.value);
  }

  public setCurrentPlan(planId: string): void {
    if (!this.plans.value.hasOwnProperty(planId)) {
      throw new Error();
    }

    this.currentPlan.next(
      _.cloneDeep(this.plans.value[planId])
    );
  }

  public getPlans(): Observable<PlanSummary[]> {
    return this.plans.pipe(
      map(p => Object.keys(p).map(k => ({
        id: p[k].id,
        name: p[k].name,
      })))
    );
  }

  public addClass(searchTerm: string, campus: Campus): Observable<string> {
    return new Observable(subscriber => {
      subscriber.next('In progress...');

      this.apiService.getClass(searchTerm, campus).subscribe(
        (newClass: ClassListing) => {
          isDevMode() && console.log(newClass);
          const plan = _.cloneDeep(this.currentPlan.value);
          try {
            if (!plan.classes.some(c => c.name === newClass.name)) {
              plan.classes.push(newClass);
              if (!plan.selections.has(newClass.name)) {
                const classMap: Map<string, number> = new Map<string, number>();
                newClass.classes.forEach((classType: ClassType) => {
                  classMap.set(classType.name, 0);
                });
                plan.selections.set(newClass.name, classMap);
              }
            }
            plan.isDirty = true;
            this.currentPlan.next(plan);
            subscriber.complete();
          } catch (error) {
            console.log('error addign class');
            subscriber.error(error.message);
          }
        },
        (error: Error) => {
          subscriber.error(error.message);
        }
      );
    });
  }

  public removeClass(className: string) {
    const plan = _.cloneDeep(this.currentPlan.value);
    plan.classes = plan.classes.filter(c => className !== c.name);

    if (plan.selections.has(className)) {
      plan.selections.delete(className);
    }

    plan.isDirty = true;
    this.currentPlan.next(plan);
  }

  public changeName(name: string) {
    const plan = this.currentPlan.value;

    if (!name) {
      plan.name = this.defaultPlanName();
    }

    this.currentPlan.next({
      ...plan,
      isDirty: true,
      name
    });
  }

  public defaultPlanName(): string {
    const alreadyUsed = Object.values(this.plans.value).map(p => p.name);
    const pre = 'Semester 1 Timetable';
    let count = 2;

    let name = pre;
    while (alreadyUsed.indexOf(name) !== -1) {
      name = `${pre} ${count++}`;
    }

    return name;
  }

  private cleanPlan(): Plan {
    return {
      id: uuid.v4(),
      name: this.defaultPlanName(),
      year: 2019,
      semester: 1,
      classes: new Array<ClassListing>(),
      selections: new Map<string, Map<string, number>>(),
      lastEdited: Date.now(),
      isDirty: false,
      schemaVersion: 1
    };
  }
}
