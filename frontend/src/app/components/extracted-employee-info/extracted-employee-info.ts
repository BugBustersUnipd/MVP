import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Button } from '../button/button';
import { ExtractedEmployeeInfoRow } from '../../shared/models/result-split.model';

@Component({
  selector: 'bb-extracted-employee-info',
  imports: [TableModule, Button],
  templateUrl: './extracted-employee-info.html',
  styleUrl: './extracted-employee-info.css',
})
export class ExtractedEmployeeInfo {
  @Input() rows: ExtractedEmployeeInfoRow[] = [];
  @Output() editRequested = new EventEmitter<void>();

  requestEdit(): void {
    this.editRequested.emit();
  }
}
