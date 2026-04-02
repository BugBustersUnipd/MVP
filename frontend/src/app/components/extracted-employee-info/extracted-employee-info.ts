import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Button } from '../button/button';
import { RecipientInfo } from '../../shared/models/result-split.model';

export interface ExtractedEmployeeInfoRow {
  recipient: RecipientInfo;
  rawName: string;
  hasMatch: boolean;
  recipientConfidence: number | null;
}

@Component({
  selector: 'bb-extracted-employee-info',
  imports: [TableModule, ButtonModule, Button],
  templateUrl: './extracted-employee-info.html',
  styleUrl: './extracted-employee-info.css',
})
export class ExtractedEmployeeInfo {
  @Input() rows: ExtractedEmployeeInfoRow[] = [];
  @Output() editRequested = new EventEmitter<void>();
  @Output() rowRemoved = new EventEmitter<number>();

  requestEdit(): void {
    this.editRequested.emit();
  }

  requestRowRemoval(rowIndex: number): void {
    this.rowRemoved.emit(rowIndex);
  }
}
