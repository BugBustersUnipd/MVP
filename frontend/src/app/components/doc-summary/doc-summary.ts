import { Component, Input, EventEmitter, Output } from '@angular/core';
import { InputComponent } from '../input/input';
import { Button } from '../button/button';
import { StatusPill } from '../status-pill/status-pill';
import { ResultSplit } from '../../shared/models/result-split.model';
import { PageRangeInput } from '../page-range-input/page-range-input';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'bb-doc-summary',
  imports: [InputComponent, Button, StatusPill, PageRangeInput, CommonModule],
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

  getFieldConfidence(...keys: string[]): number | null {
    const conf = this.result?.fieldConfidences;
    if (!conf) return null;
    for (const key of keys) {
      if (key in conf && conf[key] > 0) return conf[key];
    }
    return null;
  }

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
    const value = this.getFieldValue('month_year', 'Non trovato');
    const raw = String(value ?? '').trim();
    if (!raw) {
      return 'Non trovato';
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

  getInternalDateValue(): string {
    const modified = this.pendingModifications.data_interna;
    const original = this.result?.data_interna;
    const value = modified ?? original;

    if (value === undefined || value === null) {
      return 'Non trovato';
    }

    const raw = String(value).trim();
    if (!raw) {
      return 'Non trovato';
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
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
