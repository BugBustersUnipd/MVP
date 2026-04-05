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
  
  	formatConfidence(value: number | null | undefined): string {
		if (value === null || value === undefined || !Number.isFinite(value)) {
			return '';
		}

		const truncated = Math.trunc(value * 10) / 10;
		return truncated.toLocaleString('en-US', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		});
	}
  requestEdit(): void {
    this.editRequested.emit();
  }
}
