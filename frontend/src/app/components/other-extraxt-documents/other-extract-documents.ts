import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { OtherExtractDocumentRow } from '../../shared/models/result-split.model';

@Component({
	selector: 'app-other-extract-documents',
	imports: [CommonModule, TableModule, ButtonModule],
	templateUrl: './other-extract-documents.html',
	styleUrl: './other-extract-documents.css',
})
export class OtherExtractDocuments {
	@Input() rows: OtherExtractDocumentRow[] = [];
	@Output() rowRemoved = new EventEmitter<number>();

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

	requestRowRemoval(rowId: number): void {
		this.rowRemoved.emit(rowId);
	}
}
