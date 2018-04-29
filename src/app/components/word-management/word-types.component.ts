import { Component, OnInit } from '@angular/core';
import { WordTypeEntity, WordEntity } from '../../model';
import { WordTypeEntityService } from '../../services';

@Component({
  selector: 'word-types',
  templateUrl: './word-types.component.html',
  styleUrls: ['./word-types.component.scss']
})
export class WordTypesComponent implements OnInit {
  public wordTypeEntities: WordTypeEntity[] = [];

  public editedWordTypeEntity: WordTypeEntity;

  public editedWordEntity: WordEntity = {
    type: undefined,
    texts: {}
  };

  public constructor(
    private wordTypeEntityService: WordTypeEntityService
  ) {
  }

  public ngOnInit(): void {
    this.loadWordTypeEntities();
  }

  private loadWordTypeEntities() {
    this.editedWordTypeEntity = undefined;
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.wordTypeEntities = wordTypeEntities;
    });
  }

  public createWordTypeEntity() {
    this.editedWordTypeEntity = {
      title: '',
      keys: []
    };
  }

  public editWordTypeEntity(wordTypeEntity: WordTypeEntity) {
    this.editedWordTypeEntity = JSON.parse(JSON.stringify(wordTypeEntity));
  }

  public wordTypeEditCancelled() {
    this.editedWordTypeEntity = undefined;
  }

  public wordTypeEntityDeleted() {
    this.editedWordTypeEntity = undefined;
    this.loadWordTypeEntities();
  }

  public wordTypeEntitySaved(wordTypeEntity: WordTypeEntity) {
    this.editedWordTypeEntity = undefined;
    this.loadWordTypeEntities();
  }
}
