import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatButtonModule,
  MatCardModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatCheckboxModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { SharedModule } from '../shared';
import { SettingsComponent } from './settings.component';
import { SettingsRoutingModule } from './settings.routing.module';

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
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    SharedModule,
    SettingsRoutingModule
  ],
  declarations: [
    SettingsComponent
  ]
})
export class SettingsModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: SettingsModule,
      providers: []
    };
  }
}
