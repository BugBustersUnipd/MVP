import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
@Component({
  selector: 'app-editor',
  imports: [EditorModule, FormsModule],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {
@Input() text: string = '';
@Input() editable: boolean = false;
@Output() textChange = new EventEmitter<string>();
editorText: string = '';

ngOnChanges(changes: SimpleChanges): void {
  if (changes['text']) {
    this.editorText = this.text ?? '';
  }
}

onTextModelChange(value: string): void {
  this.editorText = value ?? '';
  this.textChange.emit(this.editorText);
}
}
