import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RatingModule } from 'primeng/rating';

@Component({
  selector: 'app-valutazione',
  imports: [FormsModule, RatingModule],
  templateUrl: './valutazione.html',
  styleUrl: './valutazione.css',
})
export class Valutazione {
  @Input() rating: number = 0;
  @Output() ratingChange = new EventEmitter<number>();
}