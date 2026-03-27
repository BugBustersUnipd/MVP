import { Component, Input, EventEmitter, Output } from '@angular/core';
import { InputComponent } from '../input/input';
import { Button } from '../button/button';
import { StatusPill } from '../status-pill/status-pill';
import { ResultSplit } from '../../shared/models/result-split.model';
import { PageRangeInput } from '../page-range-input/page-range-input';
import { PdfPreview } from '../pdf-preview/pdf-preview';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'bb-doc-summary',
  imports: [InputComponent, Button, StatusPill, PageRangeInput, PdfPreview, CommonModule],
  templateUrl: './doc-summary.html',
  styleUrl: './doc-summary.css',
})
export class DocSummary {
  @Input() editable: boolean = false;
  @Input() result: ResultSplit | null = null;
  @Input() pendingModifications: Partial<ResultSplit> = {};
  @Input() pages: number = 0;
  @Output() openOriginalPdf = new EventEmitter<void>();
  @Output() openSplitPdf = new EventEmitter<void>();
  @Output() fieldModified = new EventEmitter<{ field: keyof ResultSplit; value: string | number | undefined }>();

  pdfUrl: string = 'prova.pdf';

  getFieldValue(field: keyof ResultSplit, fallback: string = 'Non trovato'): string | number {
    const modified = this.pendingModifications[field];
    if (modified !== undefined && modified !== null) {
      return modified as string | number;
    }

    const original = this.result?.[field];
    if (original !== undefined && original !== null && `${original}`.length > 0) {
      return original as string | number;
    }

    return fallback;
  }

  onFieldChange(field: keyof ResultSplit, value: string | number | undefined): void {
    this.fieldModified.emit({ field, value });
  }

}
