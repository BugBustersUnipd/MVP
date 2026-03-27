import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'bb-status-pill',
  imports: [CommonModule, FormsModule],
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.css',
})
export class StatusPill {
  @Input() state: string ="";
}
