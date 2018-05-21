import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatCardModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { NgxChartsModule } from '@swimlane/ngx-charts';

import { SharedModule } from '../shared';

import { StatisticsService } from './statistics.service';
import { StatisticsComponent } from './statistics.component';
import { StatisticsRoutingModule } from './statistics.routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useExisting: TranslateHttpLoader
      }
    }),
    MatCardModule,
    NgxChartsModule,
    SharedModule,
    StatisticsRoutingModule
  ],
  declarations: [
    StatisticsComponent
  ],
  exports: [
    StatisticsComponent
  ]
})
export class StatisticsModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: StatisticsModule,
      providers: [
        StatisticsService
      ]
    };
  }
}
