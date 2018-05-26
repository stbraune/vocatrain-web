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

import { WatchComponent } from './watch.component';
import { WatchRoutingModule } from './watch.routing.module';
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
    WatchRoutingModule
  ],
  declarations: [
    WatchComponent
  ]
})
export class WatchModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: WatchModule,
      providers: [
      ]
    };
  }
}
