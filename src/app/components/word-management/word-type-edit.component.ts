import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { WordTypeEntityService } from '../../services';
import { WordTypeEntity } from '../../model';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'word-type-edit',
  templateUrl: './word-type-edit.component.html',
  styleUrls: ['./word-type-edit.component.scss']
})
export class WordTypeEditComponent {
  @Input()
  public wordTypeEntity: WordTypeEntity;

  public editWordTypeKey = '';

  @Output()
  public wordTypeCancelled = new EventEmitter<void>();

  @Output()
  public wordTypeDeleted = new EventEmitter<void>();

  @Output()
  public wordTypeSaved = new EventEmitter<WordTypeEntity>();

  public constructor(
    private wordTypeEntityService: WordTypeEntityService,
    private snackBar: MatSnackBar
  ) {
  }

  public onWordTypeKeysKeyPress($event: KeyboardEvent) {
    if ($event.charCode === 13) {
      if (this.editWordTypeKey.trim() !== '') {
        this.wordTypeEntity.keys.push(this.editWordTypeKey);
        this.editWordTypeKey = '';
      }
    }
  }

  public deleteWordTypeKey(wordTypeKey: string) {
    const index = this.wordTypeEntity.keys.indexOf(wordTypeKey);
    if (index !== -1) {
      this.wordTypeEntity.keys.splice(index, 1);
    }
  }

  public onDelete() {
    if (this.wordTypeEntity._id) {
      this.wordTypeEntityService.deleteWordTypeEntity(this.wordTypeEntity).subscribe((result) => {
        this.snackBar.open('Entry deleted', null, { duration: 3000 });
        this.wordTypeDeleted.emit();
      }, (error) => {
        this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
      });
    }
  }

  public onCancel() {
    this.wordTypeCancelled.emit();
  }


  public onSave() {
    this.wordTypeEntityService.postWordTypeEntity(this.wordTypeEntity).subscribe((wordTypeEntity) => {
      this.editWordTypeKey = '';
      this.wordTypeSaved.emit(wordTypeEntity);
      this.snackBar.open('Saved!', null, { duration: 3000 });
    }, (error) => {
      console.error(error);
      this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
    });
  }
}
