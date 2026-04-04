import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { OtherExtractDocumentRow } from '../../shared/models/result-split.model';

@Component({
	selector: 'app-other-extract-documents',
	imports: [CommonModule, TableModule],
	templateUrl: './other-extract-documents.html',
	styleUrl: './other-extract-documents.css',
})
export class OtherExtractDocuments {
	@Input() rows: OtherExtractDocumentRow[] = [];

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

}
