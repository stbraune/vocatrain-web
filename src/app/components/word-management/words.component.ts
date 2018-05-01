import { Component, OnInit, Input } from '@angular/core';
import { WordTypeEntityService, WordEntityService } from '../../services';
import { WordTypeEntity, WordEntity } from '../../model';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.scss']
})
export class WordsComponent implements OnInit {
  public wordEntities: WordEntity[] = [];
  public wordTypeEntities: WordTypeEntity[] = [];

  public emptyWordEntity: WordEntity = {
    type: undefined,
    texts: [
      {
        meta: '',
        tags: [],
        words: {}
      }
    ]
  };

  public editedWordEntity: WordEntity = this.newWordEntity();

  @Input()
  public supportedLanguages = environment.languages;

  public constructor(
    private wordTypeEntityService: WordTypeEntityService,
    private wordEntityService: WordEntityService
  ) {
  }

  public ngOnInit(): void {
    this.loadWordTypeEntities();
    this.loadWordEntities();
    this.createWordEntity();
  }

  private loadWordTypeEntities() {
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.wordTypeEntities = wordTypeEntities;
    });
  }

  private loadWordEntities() {
    this.editedWordEntity = undefined;
    this.wordEntityService.getWordEntities().subscribe((wordEntities) => {
      this.wordEntities = wordEntities;
    });
  }

  public createWordEntity() {
    this.editedWordEntity = this.newWordEntity();
  }

  public editWordEntity(wordEntity: WordEntity) {
    this.editedWordEntity = this.cloneWordEntity(wordEntity);
  }

  public wordEntitySaved(wordEntity: WordEntity) {
    console.log('persisted', wordEntity);
    this.loadWordEntities();
    this.editedWordEntity = this.newWordEntity();
  }

  public wordEntityCancelled() {
    this.editedWordEntity = this.newWordEntity();
  }

  public wordEntityDeleted() {
    this.loadWordEntities();
  }

  private newWordEntity() {
    return this.cloneWordEntity(this.emptyWordEntity);
  }

  private cloneWordEntity(wordEntity: WordEntity) {
    return JSON.parse(JSON.stringify(wordEntity));
  }
}
