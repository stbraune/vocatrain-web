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
  MatCheckboxModule,
  MatExpansionModule
} from '@angular/material';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { DatabaseService } from './database';
import { DateFormatService } from './date-format';
import { GoogleTranslateService, GoogleTranslateButtonComponent } from './google-translate';

import { ChipInputComponent } from './chip-input';
import { ChipsComponent, ChipComponent } from './chips';
import { KeyComponent } from './key';

import { WordEntityService, WordEditComponent, WordsEditorComponent, TextEditComponent } from './words';

import { SearchOptionsComponent } from './search-options';
import { GameLogEntityService } from './game-log';
import { GameService } from './game';
import { LoadingIndicatorService } from './loading-indicator';
import { SettingsService } from './settings';
import { DialogTextGameService, DialogTextSearchOptionsComponent } from './dialog-text-game';

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
    MatExpansionModule,
    MatRadioModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatTooltipModule
  ],
  declarations: [
    GoogleTranslateButtonComponent,
    ChipInputComponent,
    ChipComponent,
    ChipsComponent,
    KeyComponent,
    SearchOptionsComponent,
    DialogTextSearchOptionsComponent,
    TextEditComponent,
    WordEditComponent,
    WordsEditorComponent
  ],
  exports: [
    GoogleTranslateButtonComponent,
    ChipInputComponent,
    ChipComponent,
    ChipsComponent,
    KeyComponent,
    SearchOptionsComponent,
    DialogTextSearchOptionsComponent,
    WordEditComponent,
    WordsEditorComponent
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
        GameService,
        GameLogEntityService,
        DialogTextGameService,
        LoadingIndicatorService,
        SettingsService
      ]
    };
  }
}
