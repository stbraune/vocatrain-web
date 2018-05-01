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
import { WordTypeEntityService, WordEntityService } from '../../services';
import { WordTypeEntity, WordEntity } from '../../model';
import { MatSnackBar, MatSelect } from '@angular/material';
import { Text } from '../../model/text';
import { ChipInputComponent } from './chip-input.component';
import { Subject } from 'rxjs/Subject';

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
    private snackBar: MatSnackBar
  ) {
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.wordEntity) {
      if (this.wordEntity.type) {
        this.wordEntity.type = this.wordTypeEntities.find((x) => x._id === this.wordEntity.type._id);
      }
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

  public onDeleteText(text: Text) {
    const index = this.wordEntity.texts.indexOf(text);
    if (index !== -1) {
      this.wordEntity.texts.splice(index, 1);
    }
  }

  public onAddText() {
    this.wordEntity.texts.push({
      meta: '',
      tags: [],
      words: {}
    });
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
      const index = this.wordEntity.texts.indexOf(text);
      if (index !== -1) {
        this.deferredNavigate = { row: row, col: 0, dir: 'left' };
        this.wordEntity.texts.splice(index, 1);
      }
    }
  }

  public onEnterPressed(source: HTMLElement, text: Text) {
    const row = parseInt(source.dataset.row, 10);
    const col = parseInt(source.dataset.col, 10);
    console.log(row, col, JSON.parse(JSON.stringify(text)));

    if (this.isEmpty(text)) {
      // text is totally empty, remove it and save the word
      const index = this.wordEntity.texts.indexOf(text);
      if (index !== -1) {
        this.wordEntity.texts.splice(index, 1);
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
      && (Object.keys(text.words).length === 0 || Object.keys(text.words).every((k) => text.words[k] === ''));
  }

  public onDelete() {
    if (this.wordEntity._id) {
      this.wordEntityService.deleteWordEntity(this.wordEntity).subscribe((result) => {
        this.snackBar.open('Entry deleted', null, { duration: 3000 });
        this.wordDeleted.emit();
      }, (error) => {
        console.error(error);
        this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
      });
    }
  }

  public onCancel() {
    this.wordCancelled.emit();
  }

  public onSave() {
    this.wordEntityService.putWordEntity(this.wordEntity).subscribe((wordEntity) => {
      this.typeSelect.focus();
      this.wordSaved.emit(wordEntity);
      this.snackBar.open('Saved!', null, {
        duration: 3000
      });
    }, (error) => {
      console.error(error);
      this.snackBar.open('Error!', 'Ok', {
        panelClass: 'error'
      });
    });
  }
}
