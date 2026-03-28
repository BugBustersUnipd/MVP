import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule, ButtonSeverity } from 'primeng/button';
@Component({
  selector: 'app-button',
  imports: [FormsModule, ButtonModule],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
@Input() label: string = '';
@Input() icon: string = '';
@Input() disabled: boolean = false;
@Input() fluid: boolean = false;
@Input() class: string = '';
@Output() action = new EventEmitter<void>();
}
