import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

export interface OtherExtractDocumentRow {
	id: number | null;
	recipientName: string;
	confidence: number;
}

@Component({
	selector: 'app-other-extract-documents',
	imports: [CommonModule, TableModule, ButtonModule],
	templateUrl: './other-extract-documents.html',
	styleUrl: './other-extract-documents.css',
})
export class OtherExtractDocuments {
	@Input() rows: OtherExtractDocumentRow[] = [];
	@Output() rowRemoved = new EventEmitter<number>();

	requestRowRemoval(rowId: number): void {
		this.rowRemoved.emit(rowId);
	}
}
