import { Component, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'chips',
  templateUrl: './chips.component.html',
  styleUrls: ['./chips.component.scss']
})
export class ChipsComponent {
  @Input()
  public chips: string[] = [];

  @Output()
  public chipsChange = new EventEmitter<string[]>();

  @Output()
  public chipClicked = new EventEmitter<string>();

  @Input()
  public mode: 'read' | 'update' = 'update';

  public deleteChip(chip: string) {
    if (this.mode !== 'update') {
      return;
    }

    const index = this.chips.indexOf(chip);
    if (index !== -1) {
      this.chips.splice(index, 1);
      this.emitChipsChange();
    }
  }

  public onChipClicked(chip: string) {
    this.chipClicked.emit(chip);
  }

  private emitChipsChange() {
    this.chipsChange.emit(this.chips);
  }
}
