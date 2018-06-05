import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatButtonModule,
  MatCardModule,
  MatProgressSpinnerModule,
  MatIconModule,
  MatFormFieldModule,
  MatTooltipModule,
  MatInputModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { DupesComponent } from './dupes.component';
import { DupesRoutingModule } from './dupes.routing.module';
import { SharedModule } from '../shared';

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
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    SharedModule,
    DupesRoutingModule
  ],
  declarations: [
    DupesComponent
  ]
})
export class DupesModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: DupesModule,
      providers: [
      ]
    };
  }
}
