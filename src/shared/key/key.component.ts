import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'key',
  templateUrl: './key.component.html',
  styleUrls: ['./key.component.scss']
})
export class KeyComponent {
  @Input()
  public label: string;

  @Input()
  public noLabel = false;

  @Input()
  public noButton = false;

  @Output()
  public click = new EventEmitter<any>();

  public onClick($event: MouseEvent) {
    $event.stopPropagation();
    this.click.emit(this.label);
  }
}
