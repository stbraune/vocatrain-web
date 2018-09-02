import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatButtonModule,
  MatCardModule,
  MatProgressSpinnerModule,
  MatIconModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatBadgeModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { DialogTextsComponent } from './dialog-texts.component';
import { DialogTextsRoutingModule } from './dialog-texts.routing.module';
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
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SharedModule,
    DialogTextsRoutingModule
  ],
  declarations: [
    DialogTextsComponent
  ]
})
export class DialogTextsModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: DialogTextsModule,
      providers: [
      ]
    };
  }
}
