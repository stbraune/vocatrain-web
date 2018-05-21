import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import {
  MatBottomSheetModule,
  MatButtonModule,
  MatChipsModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatTooltipModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { SettingsModule } from '../settings';

import { DatabaseService } from './database';

import { GoogleTranslateService, GoogleTranslateButtonComponent } from './google-translate';
import { GameLogEntityService } from './game-log';
import { ChipInputComponent } from './chip-input';
import { ChipsComponent } from './chips';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useExisting: TranslateHttpLoader
      }
    }),
    MatBottomSheetModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    SettingsModule
  ],
  declarations: [
    GoogleTranslateButtonComponent,
    ChipInputComponent,
    ChipsComponent
  ],
  exports: [
    GoogleTranslateButtonComponent,
    ChipInputComponent,
    ChipsComponent
  ]
})
export class SharedModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [
        DatabaseService,
        GoogleTranslateService,
        GameLogEntityService
      ]
    };
  }
}
