import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnInit,
  OnDestroy
} from '@angular/core';
import { MatSnackBar, MatSelect } from '@angular/material';

import { Observable, Subject, Subscription } from 'rxjs';

import { GoogleTranslateAlternative } from '../google-translate';
import { ChipInputComponent } from '../chip-input';

import { WordEntity } from './word-entity';
import { WordEntityService } from './word-entity.service';
import { Text } from './text';
import { TextEditComponent } from './text-edit.component';

@Component({
  selector: 'word-edit',
  templateUrl: './word-edit.component.html',
  styleUrls: ['./word-edit.component.scss']
})
export class WordEditComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input()
  public wordEntity: WordEntity;

  @Input()
  public availableTags: string[] = [];

  public editedWordEntity: WordEntity;

  @Input()
  public supportedLanguages: string[] = [];

  @Input()
  public supportMultipleTexts = true;

  @Output()
  public wordCancelled = new EventEmitter<void>();

  @Output()
  public wordDeleted = new EventEmitter<void>();

  @Output()
  public wordSaved = new EventEmitter<WordEntity>();

  @ViewChild('typeSelect')
  public typeSelect: MatSelect;

  @ViewChildren(TextEditComponent)
  public textEditComponents: QueryList<TextEditComponent>;

  public dialogText = false;

  private deferredNavigate: { row: number, col: number, dir: 'up' | 'right' | 'down' | 'left' };

  private wordSavedSubscription: Subscription;
  private wordDeletedSubscription: Subscription;

  public constructor(
    private wordEntityService: WordEntityService
  ) {
  }

  public ngOnInit(): void {
    this.wordSavedSubscription = this.wordEntityService.wordSaved.subscribe((savedWordEntity) => {
      if (this.wordEntity._id === savedWordEntity._id) {
        this.wordEntity = savedWordEntity;
        this.wordEntityChanged(this.wordEntity);
      }
    });

    this.wordDeletedSubscription = this.wordEntityService.wordDeleted.subscribe((deletedWordEntity) => {
      if (this.wordEntity._id === deletedWordEntity._id) {
        this.wordEntity = undefined;
        this.wordEntityChanged(this.wordEntity);
      }
    });
  }

  public ngOnDestroy() {
    this.wordSavedSubscription.unsubscribe();
    this.wordDeletedSubscription.unsubscribe();
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.wordEntity) {
      this.wordEntityChanged(this.wordEntity);
    }
  }

  private wordEntityChanged(wordEntity: WordEntity) {
    if (!wordEntity) {
      this.editedWordEntity = undefined;
      return;
    }

    this.editedWordEntity = JSON.parse(JSON.stringify(wordEntity));
    this.editedWordEntity.texts = this.editedWordEntity.texts || [];
    this.editedWordEntity.texts.forEach((text) => {
      this.supportedLanguages.forEach((lang) => {
        if (typeof text.words[lang] === 'string') {
          text.words[lang] = {
            value: <any>text.words[lang],
            games: {}
          };
        }

        text.words[lang] = text.words[lang] || {
          value: '',
          games: {}
        };
      });
    });
    this.dialogText = this.editedWordEntity.texts.some((text) => text.tags.indexOf('text') !== -1);
  }

  public dialogTextChanged() {
    if (!this.editedWordEntity.texts[0]) {
      return;
    }

    const tags = this.editedWordEntity.texts[0].tags;
    const index = tags.indexOf('text');
    if (this.dialogText) {
      if (index === -1) {
        tags.push('text');
      }
    } else {
      if (index !== -1) {
        tags.splice(index, 1);
      }
    }
  }

  public ngAfterViewInit(): void {
    this.textEditComponents.changes.subscribe((x) => {
      if (this.deferredNavigate) {
        setTimeout(() => {
          this.navigateFrom(this.deferredNavigate.row, this.deferredNavigate.col, this.deferredNavigate.dir);
          this.deferredNavigate = undefined;
        });
      }
    });
  }

  public onChipClicked(chip: string) {
    const textEditComponents = this.textEditComponents.toArray();
    if (textEditComponents.length > 0) {
      textEditComponents[0].toggleChip(chip);
    }
  }

  public onChipsChange($event: any) {
    this.dialogText = this.editedWordEntity.texts.some((text) => text.tags.indexOf('text') !== -1);
  }

  public onDeleteText(text: Text) {
    if (!this.supportMultipleTexts) {
      return;
    }

    const index = this.editedWordEntity.texts.indexOf(text);
    if (index !== -1) {
      this.editedWordEntity.texts.splice(index, 1);
    }
  }

  public onAddText() {
    if (!this.supportMultipleTexts) {
      return;
    }

    this.editedWordEntity.texts.push({
      meta: '',
      tags: [],
      words: Object.assign({}, ...this.supportedLanguages.map((lang) => ({
        [lang]: {
          value: ''
        }
      })))
    });
  }

  public onTranslationSelected(
    textIndex: number,
    languageIndex: number,
    sourceLanguage: string,
    alternative: GoogleTranslateAlternative & { language: string }
  ) {
    this.editedWordEntity.texts[textIndex].words[alternative.language].value = alternative.text;
  }

  public navigate($event: { source: HTMLElement, direction: 'up' | 'right' | 'down' | 'left' }) {
    const row = parseInt($event.source.dataset.row, 10);
    const col = parseInt($event.source.dataset.col, 10);
    this.navigateFrom(row, col, $event.direction);
  }

  private navigateFrom(row: number, col: number, direction: 'up' | 'right' | 'down' | 'left') {
    const countCols = this.countCols();
    const countRows = this.countRows();

    switch (direction) {
      case 'up':
        row = Math.max(row - 1, 0);
        break;
      case 'down':
        row = Math.min(row + 1, countRows - 1);
        break;
      case 'left':
        if (col - 1 < 0 && row > 0) {
          col = countCols - 1;
          row = Math.max(row - 1, 0);
        } else {
          col = Math.max(col - 1, 0);
        }
        break;
      case 'right':
        if (col + 1 > countCols - 1 && row < countRows - 1) {
          col = 0;
          row = Math.min(row + 1, countRows - 1);
        } else {
          col = Math.min(col + 1, countCols - 1);
        }
        break;
      default:
        // do nothing
        break;
    }

    this.textEditComponents.toArray()[row].focusChipInput(col);
  }

  private countCols() {
    return this.supportedLanguages.length + 1;
  }

  private countRows() {
    return this.textEditComponents.length;
  }

  public onBackspacePressed($event: { source: HTMLElement, text: Text }) {
    const row = parseInt($event.source.dataset.row, 10);
    const col = parseInt($event.source.dataset.col, 10);
    if (this.isEmpty($event.text) && this.supportMultipleTexts) {
      const index = this.editedWordEntity.texts.indexOf($event.text);
      if (index !== -1) {
        this.deferredNavigate = { row: row, col: 0, dir: 'left' };
        this.editedWordEntity.texts.splice(index, 1);
      }
    }
  }

  public onEnterPressed($event: { source: HTMLElement, text: Text }) {
    if (!this.supportMultipleTexts) {
      // no multiple texts supported, just save the word
      this.onSave();
      return;
    }

    const row = parseInt($event.source.dataset.row, 10);
    const col = parseInt($event.source.dataset.col, 10);

    if (this.isEmpty($event.text)) {
      // text is totally empty, remove it and save the word
      const index = this.editedWordEntity.texts.indexOf($event.text);
      if (index !== -1) {
        this.editedWordEntity.texts.splice(index, 1);
      }
      this.onSave();
    } else {
      // text is not empty, maybe add another text
      const rows = this.countRows();
      const cols = this.countCols();
      if (row < rows - 1) {
        this.navigateFrom(row, cols - 1, 'right');
      } else {
        this.onAddText();
        this.deferredNavigate = { row, col: cols - 1, dir: 'right' };
      }
    }
  }

  private isEmpty(text: Text) {
    return text.meta === ''
      && (!text.tags || text.tags.length === 0)
      && (Object.keys(text.words).length === 0 || Object.keys(text.words).every((k) => text.words[k].value === ''));
  }

  public onSave() {
    this.wordSaved.emit(this.editedWordEntity);
  }
}
