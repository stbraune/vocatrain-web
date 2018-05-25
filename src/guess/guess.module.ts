import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatButtonModule,
  MatCardModule,
  MatProgressSpinnerModule,
  MatIconModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { GuessComponent } from './guess.component';
import { GuessRoutingModule } from './guess.routing.module';
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
    SharedModule,
    GuessRoutingModule
  ],
  declarations: [
    GuessComponent
  ]
})
export class GuessModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: GuessModule,
      providers: [
      ]
    };
  }
}
