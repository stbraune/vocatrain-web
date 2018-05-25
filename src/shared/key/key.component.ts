import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'key',
  templateUrl: './key.component.html',
  styleUrls: ['./key.component.scss']
})
export class KeyComponent {
  @Input()
  public label: string;

  @Output()
  // public click = new EventEmitter<MouseEvent>();
  public click = new EventEmitter<any>();

  public onClick($event: MouseEvent) {
    $event.stopPropagation();
    // this.click.emit($event);
    this.click.emit(this.label);
  }
}
