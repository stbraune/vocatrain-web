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
  MatTooltipModule,
  MatRadioModule,
  MatSelectModule,
  MatCheckboxModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { SettingsModule } from '../settings';

import { DatabaseService } from './database';
import { DateFormatService } from './date-format';
import { GoogleTranslateService, GoogleTranslateButtonComponent } from './google-translate';

import { ChipInputComponent } from './chip-input';
import { ChipsComponent, ChipComponent } from './chips';
import { KeyComponent } from './key';

import { WordEntityService } from './words';
import { WordTypeEntityService } from './word-types';

import { SearchOptionsComponent } from './search-options';
import { GameLogEntityService } from './game-log';
import { GameService } from './game';

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
    MatCheckboxModule,
    MatChipsModule,
    MatRadioModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatTooltipModule,
    SettingsModule
  ],
  declarations: [
    GoogleTranslateButtonComponent,
    ChipInputComponent,
    ChipComponent,
    ChipsComponent,
    KeyComponent,
    SearchOptionsComponent
  ],
  exports: [
    GoogleTranslateButtonComponent,
    ChipInputComponent,
    ChipComponent,
    ChipsComponent,
    KeyComponent,
    SearchOptionsComponent
  ]
})
export class SharedModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [
        DatabaseService,
        DateFormatService,
        GoogleTranslateService,
        WordEntityService,
        WordTypeEntityService,
        GameService,
        GameLogEntityService
      ]
    };
  }
}
