import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';

import { Injectable } from '@angular/core';
import { NavigationStart, Router, UrlSegment } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operator/map';
import { mergeStatic } from 'rxjs/operator/merge';
import { Subject } from 'rxjs/Subject';

import { TourAnchorDirective } from './tour-anchor.directive';

export interface IStepOption {
  stepId?: string;
  anchorId?: string;
  title?: string;
  content?: string;
  route?: string | UrlSegment[];
  nextStep?: number | string;
  prevStep?: number | string;
  placement?: any;
  preventScrolling?: boolean;
}

export enum TourState {
  OFF,
  ON,
  PAUSED,
}

@Injectable()
export class TourService<T extends IStepOption = IStepOption> {

  public stepShow$: Subject<T> = new Subject();
  public stepHide$: Subject<T> = new Subject();
  public initialize$: Subject<T[]> = new Subject();
  public start$: Subject<T> = new Subject();
  public end$: Subject<any> = new Subject();
  public pause$: Subject<T> = new Subject();
  public resume$: Subject<T> = new Subject();
  public anchorRegister$: Subject<string> = new Subject();
  public anchorUnregister$: Subject<string> = new Subject();
  public events$: Observable<{ name: string, value: any }> = mergeStatic(
    map.bind(this.stepShow$)(value => ({ name: 'stepShow', value })),
    map.bind(this.stepHide$)(value => ({ name: 'stepHide', value })),
    map.bind(this.initialize$)(value => ({ name: 'initialize', value })),
    map.bind(this.start$)(value => ({ name: 'start', value })),
    map.bind(this.end$)(value => ({ name: 'end', value })),
    map.bind(this.pause$)(value => ({ name: 'pause', value })),
    map.bind(this.resume$)(value => ({ name: 'resume', value })),
    map.bind(this.anchorRegister$)(value => ({ name: 'anchorRegister', value })),
    map.bind(this.anchorUnregister$)(value => ({ name: 'anchorUnregister', value })),
  );

  public steps: T[] = [];
  public currentStep: T;

  public anchors: { [anchorId: string]: TourAnchorDirective } = {};
  private status: TourState = TourState.OFF;

  constructor(private router: Router) { }

  public initialize(steps: T[], stepDefaults?: T): void {
    if (steps && steps.length > 0) {
      this.status = TourState.OFF;
      this.steps = steps.map(step => Object.assign({}, stepDefaults, step));
      this.initialize$.next(this.steps);
    }
  }

  public start(): void {
    this.startAt(0);
  }

  public startAt(stepId: number | string): void {
    this.status = TourState.ON;
    this.goToStep(this.loadStep(stepId));
    this.start$.next();
    this.router.events.filter(event => event instanceof NavigationStart).first().subscribe(() => {
      if (this.currentStep) {
        this.hideStep(this.currentStep);
      }
    });
  }

  public end(): void {
    this.status = TourState.OFF;
    this.hideStep(this.currentStep);
    this.currentStep = undefined;
    this.end$.next();
  }

  public pause(): void {
    this.status = TourState.PAUSED;
    this.hideStep(this.currentStep);
    this.pause$.next();
  }

  public resume(): void {
    this.status = TourState.ON;
    this.showStep(this.currentStep);
    this.resume$.next();
  }

  public toggle(pause?: boolean): void {
    if (pause) {
      if (this.currentStep) {
        this.pause();
      } else {
        this.resume();
      }
    } else {
      if (this.currentStep) {
        this.end();
      } else {
        this.start();
      }
    }
  }

  public next(): void {
    if (this.hasNext(this.currentStep)) {
      this.goToStep(this.loadStep(this.currentStep.nextStep || this.steps.indexOf(this.currentStep) + 1));
    }
  }

  public hasNext(step: T): boolean {
    if (!step) {
      console.warn('Can\'t get next step. No currentStep.');
      return false;
    }
    return step.nextStep !== undefined || this.steps.indexOf(step) < this.steps.length - 1;
  }

  public prev(): void {
    if (this.hasPrev(this.currentStep)) {
      this.goToStep(this.loadStep(this.currentStep.prevStep || this.steps.indexOf(this.currentStep) - 1));
    }
  }

  public hasPrev(step: T): boolean {
    if (!step) {
      console.warn('Can\'t get previous step. No currentStep.');
      return false;
    }
    return step.prevStep !== undefined || this.steps.indexOf(step) > 0;
  }

  public goto(stepId: number | string): void {
    this.goToStep(this.loadStep(stepId));
  }

  public register(anchorId: string, anchor: TourAnchorDirective): void {
    if (this.anchors[anchorId]) {
      throw new Error('anchorId ' + anchorId + ' already registered!');
    }
    this.anchors[anchorId] = anchor;
    this.anchorRegister$.next(anchorId);
  }

  public unregister(anchorId: string): void {
    delete this.anchors[anchorId];
    this.anchorUnregister$.next(anchorId);
  }

  public getStatus(): TourState {
    return this.status;
  }

  private goToStep(step: T): void {
    if (!step) {
      console.warn('Can\'t go to non-existent step');
      this.end();
      return;
    }
    let navigatePromise: Promise<boolean> = new Promise(resolve => resolve(true));
    if (step.route !== undefined && typeof (step.route) === 'string') {
      navigatePromise = this.router.navigateByUrl(step.route);
    } else if (step.route && Array.isArray(step.route)) {
      navigatePromise = this.router.navigate(step.route);
    }
    navigatePromise.then(navigated => {
      if (navigated !== false) {
        setTimeout(() => this.setCurrentStep(step));
      }
    });
  }

  private loadStep(stepId: number | string): T {
    if (typeof (stepId) === 'number') {
      return this.steps[stepId];
    } else {
      return this.steps.find(step => step.stepId === stepId);
    }
  }

  private setCurrentStep(step: T): void {
    if (this.currentStep) {
      this.hideStep(this.currentStep);
    }
    this.currentStep = step;
    this.showStep(this.currentStep);
    this.router.events.filter(event => event instanceof NavigationStart).first().subscribe(() => {
      if (this.currentStep) {
        this.hideStep(this.currentStep);
      }
    });
  }

  private showStep(step: T): void {
    const anchor = this.anchors[step && step.anchorId];
    if (!anchor) {
      console.warn('Can\'t attach to unregistered anchor with id ' + step.anchorId);
      this.end();
      return;
    }
    anchor.showTourStep(step);
    this.stepShow$.next(step);
  }

  private hideStep(step: T): void {
    const anchor = this.anchors[step && step.anchorId];
    if (!anchor) {
      return;
    }
    anchor.hideTourStep();
    this.stepHide$.next(step);
  }
}
