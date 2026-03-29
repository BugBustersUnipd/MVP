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

  getMonthYearValue(): string {
    const value = this.getFieldValue('data', '');
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }

    const monthYearMatch = raw.match(/^(\d{1,2})[\/-](\d{4})$/);
    if (monthYearMatch) {
      const month = monthYearMatch[1].padStart(2, '0');
      return `${month}/${monthYearMatch[2]}`;
    }

    const yearMonthMatch = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (yearMonthMatch) {
      return `${yearMonthMatch[2]}/${yearMonthMatch[1]}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${month}/${year}`;
    }

    return raw;
  }

  getPageStartValue(): number | undefined {
    return this.toNumber(this.pendingModifications.page_start, this.result?.page_start);
  }

  getPageEndValue(): number | undefined {
    return this.toNumber(this.pendingModifications.page_end, this.result?.page_end);
  }

  private toNumber(primary: unknown, fallback: unknown): number | undefined {
    const candidate = primary ?? fallback;
    if (candidate === undefined || candidate === null || candidate === '') {
      return undefined;
    }
    const parsed = Number(candidate);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

}
