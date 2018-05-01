import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { WordTypeEntityService, WordEntityService } from '../../services';
import { WordTypeEntity, WordEntity } from '../../model';
import { MatSnackBar } from '@angular/material';
import { Text } from '../../model/text';
import { ChipInputComponent } from './chip-input.component';

@Component({
  selector: 'word-edit',
  templateUrl: './word-edit.component.html',
  styleUrls: ['./word-edit.component.scss']
})
export class WordEditComponent {
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

  @ViewChildren(ChipInputComponent)
  public chipInputComponents: QueryList<ChipInputComponent>;

  public constructor(
    private wordEntityService: WordEntityService,
    private snackBar: MatSnackBar
  ) {
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
    let row = parseInt(source.dataset.row, 10);
    let col = parseInt(source.dataset.col, 10);

    const countCols = this.supportedLanguages.length + 1;
    const countRows = Math.ceil(this.chipInputComponents.length / countCols);

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

  public onDelete() {
    if (this.wordEntity._id) {
      this.wordEntityService.deleteWordEntity(this.wordEntity).subscribe((result) => {
        this.snackBar.open('Entry deleted', null, { duration: 3000 });
        this.wordDeleted.emit();
      }, (error) => {
        this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
      });
    }
  }

  public onCancel() {
    this.wordCancelled.emit();
  }

  public onSave() {
    this.wordEntityService.postWordEntity(this.wordEntity).subscribe((wordEntity) => {
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
