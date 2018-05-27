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
  OnInit
} from '@angular/core';
import { MatSnackBar, MatSelect } from '@angular/material';

import { Observable ,  Subject } from 'rxjs';

import { GoogleTranslateService, GoogleTranslateAlternative, ChipInputComponent } from '../../../shared';
import { WordTypeEntityService, WordEntityService, WordTypeEntity, WordEntity, Text } from '../../../shared';

@Component({
  selector: 'word-edit',
  templateUrl: './word-edit.component.html',
  styleUrls: ['./word-edit.component.scss']
})
export class WordEditComponent implements AfterViewInit, OnChanges {
  @Input()
  public wordTypeEntities: WordTypeEntity[] = [];

  @Input()
  public wordEntity: WordEntity;

  public editedWordEntity: WordEntity;

  @Input()
  public supportedLanguages: string[] = [];

  @Output()
  public wordCancelled = new EventEmitter<void>();

  @Output()
  public wordDeleted = new EventEmitter<void>();

  @Output()
  public wordSaved = new EventEmitter<WordEntity>();

  @ViewChild('typeSelect')
  public typeSelect: MatSelect;

  @ViewChildren(ChipInputComponent)
  public chipInputComponents: QueryList<ChipInputComponent>;

  private deferredNavigate: { row: number, col: number, dir: 'up' | 'right' | 'down' | 'left' };

  public constructor(
    private wordEntityService: WordEntityService,
    private googleTranslateService: GoogleTranslateService,
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.wordEntity) {
      this.editedWordEntity = JSON.parse(JSON.stringify(this.wordEntity));
      if (this.editedWordEntity.type) {
        this.editedWordEntity.type = this.wordTypeEntities.find((x) => x._id === this.editedWordEntity.type._id);
      }

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
    }
  }

  public ngAfterViewInit(): void {
    this.chipInputComponents.changes.subscribe((x) => {
      if (this.deferredNavigate) {
        setTimeout(() => {
          this.navigateFrom(this.deferredNavigate.row, this.deferredNavigate.col, this.deferredNavigate.dir);
          this.deferredNavigate = undefined;
        });
      }
    });
  }

  public onChipClicked(chip: string) {
    const chipInputComponents = this.chipInputComponents.toArray();
    if (chipInputComponents.length > 0) {
      chipInputComponents[0].toggleChip(chip);
    }
  }

  public onDeleteText(text: Text) {
    const index = this.editedWordEntity.texts.indexOf(text);
    if (index !== -1) {
      this.editedWordEntity.texts.splice(index, 1);
    }
  }

  public onAddText() {
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

  public navigate(source: HTMLElement, direction: 'up' | 'right' | 'down' | 'left') {
    const row = parseInt(source.dataset.row, 10);
    const col = parseInt(source.dataset.col, 10);
    this.navigateFrom(row, col, direction);
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

    this.chipInputComponents.toArray()[row * countCols + col].focus();
  }

  private countCols() {
    return this.supportedLanguages.length + 1;
  }

  private countRows() {
    return Math.ceil(this.chipInputComponents.length / this.countCols());
  }

  public onBackspacePressed(source: HTMLElement, text: Text) {
    const row = parseInt(source.dataset.row, 10);
    const col = parseInt(source.dataset.col, 10);
    if (this.isEmpty(text)) {
      const index = this.editedWordEntity.texts.indexOf(text);
      if (index !== -1) {
        this.deferredNavigate = { row: row, col: 0, dir: 'left' };
        this.editedWordEntity.texts.splice(index, 1);
      }
    }
  }

  public onEnterPressed(source: HTMLElement, text: Text) {
    const row = parseInt(source.dataset.row, 10);
    const col = parseInt(source.dataset.col, 10);

    if (this.isEmpty(text)) {
      // text is totally empty, remove it and save the word
      const index = this.editedWordEntity.texts.indexOf(text);
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
