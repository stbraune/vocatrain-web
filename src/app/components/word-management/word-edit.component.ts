import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { WordTypeEntityService, WordEntityService } from '../../services';
import { WordTypeEntity, WordEntity } from '../../model';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'word-edit',
  templateUrl: './word-edit.component.html',
  styleUrls: ['./word-edit.component.scss']
})
export class WordEditComponent {
  @Input()
  public wordTypeEntities: WordTypeEntity[] = []

  @Input()
  public wordEntity: WordEntity;

  @Input()
  public supportedLanguages: string[] = []

  @Output()
  public wordCancelled = new EventEmitter<void>();

  @Output()
  public wordSaved = new EventEmitter<WordEntity>();

  public constructor(
    private wordEntityService: WordEntityService,
    private snackBar: MatSnackBar
  ) {
  }

  public meta(key: string) {
    return this.wordEntity && this.wordEntity.texts && this.wordEntity.texts[key] && this.wordEntity.texts[key].meta || '';
  }

  public text(key: string, lang: string) {
    return this.wordEntity && this.wordEntity.texts && this.wordEntity.texts[key] && this.wordEntity.texts[key][lang] || '';
  }

  public metaChanged(key: string, $event: Event) {
    this.wordEntity.texts = this.wordEntity.texts || {};
    this.wordEntity.texts[key] = this.wordEntity.texts[key] || {};
    this.wordEntity.texts[key].meta = $event.target['value'];
  }

  public textChanged(key: string, lang: string, $event: Event) {
    this.wordEntity.texts = this.wordEntity.texts || {};
    this.wordEntity.texts[key] = this.wordEntity.texts[key] || {};
    this.wordEntity.texts[key][lang] = $event.target['value'];
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
