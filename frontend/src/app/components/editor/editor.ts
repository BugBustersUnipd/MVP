import { Component, Input, Output, EventEmitter } from '@angular/core';
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
}
