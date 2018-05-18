import { Component, TemplateRef, ViewChild, Input, EventEmitter, Output } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material';

import { GoogleTranslateService } from './google-translate.service';
import { GoogleTranslateResult, GoogleTranslateAlternative } from './google-translate-result';

@Component({
  selector: 'google-translate-button',
  templateUrl: './google-translate-button.component.html',
  styleUrls: ['./google-translate-button.component.scss']
})
export class GoogleTranslateButtonComponent {
  @Input()
  public text = '';

  @Input()
  public from = '';

  @Input()
  public to: string[] = [];

  @Output()
  public translationSelected = new EventEmitter<GoogleTranslateAlternative & { language: string }>();

  public result: GoogleTranslateResult;

  @ViewChild('selectLanguageBottomSheetTemplate')
  public selectLanguageBottomSheetTemplate: TemplateRef<void>;

  @ViewChild('selectResultBottomSheetTemplate')
  public selectResultBottomSheetTemplate: TemplateRef<void>;

  private selectResultBottomSheetRef: MatBottomSheetRef<void, any>;
  private selectedResultLanguage: string;

  public get toLanguages(): string[] {
    return this.to.filter((to) => to !== this.from);
  }

  public constructor(
    private googleTranslateService: GoogleTranslateService,
    private bottomSheet: MatBottomSheet
  ) {
  }

  public showSuggestions($event: MouseEvent) {
    $event.stopPropagation();
    if (this.toLanguages.length === 1) {
      this.translateTo(this.toLanguages[0]);
      return;
    }

    this.bottomSheet.open(this.selectLanguageBottomSheetTemplate);
  }

  public translateTo(lang: string) {
    this.googleTranslateService.translate(this.text, {
      from: this.from,
      to: lang
    }).subscribe((result) => {
      this.result = result;
      this.selectedResultLanguage = lang;
      this.selectResultBottomSheetRef = this.bottomSheet.open(this.selectResultBottomSheetTemplate);
    });
  }

  public onTranslationClicked(alternative: GoogleTranslateAlternative) {
    this.translationSelected.emit(Object.assign({}, alternative, {
      language: this.selectedResultLanguage
    }));
    this.selectResultBottomSheetRef.dismiss();
  }
}
