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

  public deleteChip(chip: string) {
    const index = this.chips.indexOf(chip);
    if (index !== -1) {
      this.chips.splice(index, 1);
      this.emitChipsChange();
    }
  }

  private emitChipsChange() {
    this.chipsChange.emit(this.chips);
  }
}
