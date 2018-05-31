import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { WordTypeEntityService, WordTypeEntity, LoadingIndicatorService } from '../../../shared';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'word-type-edit',
  templateUrl: './word-type-edit.component.html',
  styleUrls: ['./word-type-edit.component.scss']
})
export class WordTypeEditComponent {
  @Input()
  public wordTypeEntity: WordTypeEntity;

  public editWordTypeTag = '';

  @Output()
  public wordTypeCancelled = new EventEmitter<void>();

  @Output()
  public wordTypeDeleted = new EventEmitter<void>();

  @Output()
  public wordTypeSaved = new EventEmitter<WordTypeEntity>();

  public constructor(
    private loadingIndicatorService: LoadingIndicatorService,
    private wordTypeEntityService: WordTypeEntityService,
    private snackBar: MatSnackBar
  ) {
  }

  public onWordTypeKeysKeyPress($event: KeyboardEvent) {
    if ($event.charCode === 13) {
      if (this.editWordTypeTag.trim() !== '') {
        this.wordTypeEntity.tags.push(this.editWordTypeTag);
        this.editWordTypeTag = '';
      }
    }
  }

  public deleteWordTypeKey(wordTypeKey: string) {
    const index = this.wordTypeEntity.tags.indexOf(wordTypeKey);
    if (index !== -1) {
      this.wordTypeEntity.tags.splice(index, 1);
    }
  }

  public onDelete() {
    if (this.wordTypeEntity._id) {
      this.loadingIndicatorService.notifyLoading();
      this.wordTypeEntityService.deleteWordTypeEntity(this.wordTypeEntity).subscribe((result) => {
        this.loadingIndicatorService.notifyFinished();
        this.snackBar.open('Entry deleted', null, { duration: 3000 });
        this.wordTypeDeleted.emit();
      }, (error) => {
        this.loadingIndicatorService.notifyFinished();
        this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
      });
    }
  }

  public onCancel() {
    this.wordTypeCancelled.emit();
  }


  public onSave() {
    this.loadingIndicatorService.notifyLoading();
    this.wordTypeEntityService.putWordEntity(this.wordTypeEntity).subscribe((wordTypeEntity) => {
      this.loadingIndicatorService.notifyFinished();
      this.editWordTypeTag = '';
      this.wordTypeSaved.emit(wordTypeEntity);
      this.snackBar.open('Saved!', null, { duration: 3000 });
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
      this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
    });
  }
}
