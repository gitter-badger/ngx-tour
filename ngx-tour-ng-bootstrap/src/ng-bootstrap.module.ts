import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TourModule } from 'ngx-tour-core';

import { NgbTourService } from './ng-bootstrap-tour.service';
import { TourAnchorNgBootstrapDirective } from './tour-anchor.directive';
import { TourStepTemplateComponent } from './tour-step-template.component';
import { TourStepTemplateService } from './tour-step-template.service';

export { TourAnchorNgBootstrapDirective, TourStepTemplateComponent, NgbTourService };

@NgModule({
  declarations: [TourAnchorNgBootstrapDirective, TourStepTemplateComponent],
  exports: [TourAnchorNgBootstrapDirective, TourStepTemplateComponent],
  imports: [CommonModule, NgbPopoverModule.forRoot()],
})
export class TourNgBootstrapModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: TourNgBootstrapModule,
      providers: [
        TourStepTemplateService,
        ...TourModule.forRoot().providers,
        NgbTourService
      ],
    };
  }
}
