import { Component, Input, EventEmitter, Output, ViewChildren, QueryList, OnInit } from '@angular/core';

import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, filter } from 'rxjs/operators';

import { GoogleTranslateAlternative } from '../google-translate';
import { ChipInputComponent } from '../chip-input';

import { Text } from './text';
import { WordEntityService } from './word-entity.service';

@Component({
  selector: 'text-edit',
  templateUrl: './text-edit.component.html',
  styleUrls: ['./text-edit.component.scss']
})
export class TextEditComponent implements OnInit {
  @Input()
  public text: Text;

  @Input()
  public textIndex: number;

  @Input()
  public supportMultipleTexts: boolean;

  @Input()
  public supportedLanguages: string[] = [];

  @Output()
  public deleteText = new EventEmitter<Text>();

  @Output()
  public chipsChange = new EventEmitter<any>();

  @Output()
  public cursorPressed = new EventEmitter<{
    source: HTMLElement,
    direction: 'up' | 'right' | 'down' | 'left'
  }>();

  @Output()
  public backspacePressed = new EventEmitter<{
    source: HTMLElement,
    text: Text
  }>();

  @Output()
  public enterPressed = new EventEmitter<{
    source: HTMLElement,
    text: Text
  }>();

  @ViewChildren(ChipInputComponent)
  public chipInputComponents: QueryList<ChipInputComponent>;

  public duplicates: Text[] = [];

  private wordValueChanged = new Subject<{
    lang: string,
    value: string
  }>();

  public constructor(
    private wordEntityService: WordEntityService
  ) {
  }

  public ngOnInit() {
    this.wordValueChanged
      .pipe(
        debounceTime(300),
        switchMap((wordValue) => this.wordEntityService.findDuplicates(wordValue.lang, wordValue.value))
      )
      .subscribe((duplicates) => {
        this.duplicates = duplicates.rows
          .map((row) => row.doc.texts.filter((text) => text.words[row.key[0]].value === row.key[1]))
          .reduce((prev, cur) => prev.concat(cur), [] as Text[]);
      });
  }

  public toggleChip(chip: string) {
    const chipInputComponents = this.chipInputComponents.toArray();
    if (chipInputComponents.length > 0) {
      chipInputComponents[0].toggleChip(chip);
    }
  }

  public focusChipInput(index: number) {
    this.chipInputComponents.toArray()[index].focus();
  }

  public onValueChanged(lang: string, value: string) {
    this.wordValueChanged.next({ lang, value });
  }

  public onDeleteText() {
    this.deleteText.emit(this.text);
  }

  public onChipsChange($event: any) {
    this.chipsChange.emit($event);
  }

  public onCursorPressed(source: HTMLElement, direction: 'up' | 'right' | 'down' | 'left') {
    this.cursorPressed.emit({ source, direction });
  }

  public onBackspacePressed(source: HTMLElement) {
    this.backspacePressed.emit({ source, text: this.text });
  }

  public onEnterPressed(source: HTMLElement) {
    this.enterPressed.emit({ source, text: this.text });
  }

  public onTranslationSelected(
    languageIndex: number,
    sourceLanguage: string,
    alternative: GoogleTranslateAlternative & { language: string }) {
    this.text.words[alternative.language].value = alternative.text;
  }
}
