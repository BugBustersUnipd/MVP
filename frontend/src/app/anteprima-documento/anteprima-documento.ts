import { Component, DestroyRef, inject } from '@angular/core';
import { DocSummary } from '../components/doc-summary/doc-summary';
import { ExtractedEmployeeInfo, ExtractedEmployeeInfoRow } from '../components/extracted-employee-info/extracted-employee-info';
import { ResultSplit, State } from '../shared/models/result-split.model';
import { Button } from '../components/button/button';
// da togliere
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { SendDocumentDialog,SendDocumentData } from '../components/send-document-dialog/send-document-dialog';
import { SelectEmployeesDialog, SelectEmployeeDialogResult } from '../components/select-employees-dialog/select-employees-dialog';
import { OtherExtractDocuments, OtherExtractDocumentRow } from '../components/other-extraxt-documents/other-extract-documents';
import { ToastModule } from 'primeng/toast';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, firstValueFrom, map, Observable, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-anteprima-documento',
  imports: [DocSummary, ExtractedEmployeeInfo, OtherExtractDocuments, Button, ToastModule, CommonModule],
  providers: [DialogService,MessageService],
  templateUrl: './anteprima-documento.html',
  styleUrl: './anteprima-documento.css',
})
export class AnteprimaDocumento {
  aiService = inject(AiCoPilotService);
  private destroyRef = inject(DestroyRef);
  isEditable: boolean = false;
  result$ = new BehaviorSubject<ResultSplit | null>((history.state?.result as ResultSplit | null) ?? null);
  extractedEmployeeRows$ = new BehaviorSubject<ExtractedEmployeeInfoRow[]>([]);

  get result(): ResultSplit | null {
    return this.result$.value;
  }

  set result(value: ResultSplit | null) {
    this.result$.next(value);
  }

  pendingModifications: Partial<ResultSplit> = {};
  pages: number = history.state?.pages;
  otherExtractedDocumentRows$: Observable<OtherExtractDocumentRow[]> = of([]);
  private removedOtherDocumentIds$ = new BehaviorSubject<number[]>([]);

  get extractedEmployeeRows(): ExtractedEmployeeInfoRow[] {
    return this.extractedEmployeeRows$.value;
  }

  set extractedEmployeeRows(value: ExtractedEmployeeInfoRow[]) {
    this.extractedEmployeeRows$.next(value);
  }
  
  ngOnInit() {
    this.aiService.fetchTemplates();
    this.extractedEmployeeRows = this.buildExtractedEmployeeRows(this.result);
    const currentExtractedDocumentId = this.result?.id;

    if (currentExtractedDocumentId) {
      // Always refresh from backend on page init to avoid stale history.state after Ctrl+R.
      this.aiService.fetchExtractedDocument(currentExtractedDocumentId);
    }

    this.aiService.currentResult$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        if (!updated || !this.result || updated.id !== this.result.id) {
          return;
        }
        this.applyIncomingResult(updated);
      });

    this.aiService.currentResultsHistory$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((historyRows) => {
        if (!this.result || !historyRows?.length) {
          return;
        }
        const updated = historyRows.find((row) => row.id === this.result?.id);
        if (!updated) {
          return;
        }
        this.applyIncomingResult(updated);
      });

    this.otherExtractedDocumentRows$ = combineLatest([
      this.aiService.otherExtractedDocuments$,
      this.removedOtherDocumentIds$,
    ]).pipe(
      map(([rows, removedIds]) => rows.filter((row) => !removedIds.includes(row.id!) && row.id !== currentExtractedDocumentId)),
      takeUntilDestroyed(this.destroyRef)
    );

    const parentId = this.result?.parentId;
    if (parentId) {
      this.aiService.getDocumentsByParent(parentId, currentExtractedDocumentId!);
    } else {
      this.otherExtractedDocumentRows$ = of([]);
    }
  }
  handleOpenOriginalPdf(): void {
    if (!this.result?.parentId) {
      this.messageService.add({severity:'error', summary: 'Documento originale non disponibile'});
      return;
    }
    this.aiService.getOriginalPdfById(this.result.parentId);
  }

  handleOpenSplitPdf(): void {
    if (!this.result?.id) {
      this.messageService.add({severity:'error', summary: 'Documento estratto non disponibile'});
      return;
    }
    this.aiService.getPdfById(this.result.id);
  }
// todo: questi due metodi sono da implementare, per ora loggano solo l'azione richiesta, ma in futuro dovranno interagire con i servizi per modificare lo stato dell'applicazione e mostrare le modifiche all'utente
  handleEditExtractedEmployeeInfo(): void {
    if (!this.result) {
      return;
    }

    this.aiService.fetchEmployeesByCompany(this.result.company);

    this.ref = this.dialogService.open(SelectEmployeesDialog, {
      header: 'Modifica dipendente',
      width: '42rem',
      contentStyle: { overflow: 'auto' },
      closable: true,
      autoZIndex: true,
      data: {
        extractedEmployeeName: this.result.recipientName,
        employees$: this.aiService.employees$,
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe(async (selectedEmployee: SelectEmployeeDialogResult | undefined) => {
        if (!selectedEmployee || !this.result) {
          return;
        }

        if (!this.result.id) {
          this.messageService.add({severity:'error', summary: 'Documento estratto non disponibile'});
          return;
        }

        try {
          const updated = await firstValueFrom(
            this.aiService.updateDocumentMetadata$(this.result.id, {
              recipient: selectedEmployee.name,
              recipients: [selectedEmployee.name],
            })
          );

          this.applyIncomingResult(updated);
          this.messageService.add({severity:'success', summary: 'Dipendente aggiornato'});
        } catch (error) {
          console.error('Errore nel salvataggio del dipendente:', error);
          this.messageService.add({severity:'error', summary: 'Errore salvataggio dipendente'});
        }
      });
    }
  }

  handleRemoveExtractedEmployeeRow(rowIndex: number): void {
    this.extractedEmployeeRows = this.extractedEmployeeRows.filter((_, index) => index !== rowIndex);
  }

  handleRemoveOtherExtractedDocumentRow(rowId: number): void {
    const current = this.removedOtherDocumentIds$.value;
    if (current.includes(rowId)) {
      return;
    }
    this.removedOtherDocumentIds$.next([...current, rowId]);
  }

  dialogService = inject(DialogService);
  messageService = inject(MessageService);
  ref: DynamicDialogRef | null = null;

  templates$ = this.aiService.templates$;

  private buildExtractedEmployeeRows(result: ResultSplit | null): ExtractedEmployeeInfoRow[] {
    if (!result) {
      return [];
    }

    const recipientConf = result.fieldConfidences?.['recipient'] ?? 0;
    const row: ExtractedEmployeeInfoRow = {
      name: result.recipientName ?? '',
      rawName: result.rawRecipientName ?? '',
      hasMatch: (result.recipientId ?? 0) > 0,
      recipientConfidence: recipientConf > 0 ? recipientConf : null,
      employeeCode: result.recipientCode ?? '',
      email: result.recipientEmail ?? '',
    };

    const isEmptyRow = !row.name && !row.rawName && !row.employeeCode && !row.email;
    return isEmptyRow ? [] : [row];
  }

  private applyIncomingResult(updated: ResultSplit): void {
    this.result = { ...updated };
    this.extractedEmployeeRows = this.buildExtractedEmployeeRows(this.result);
    window.history.replaceState({ ...(history.state ?? {}), result: this.result }, '');
  }

  showDialog() {
     this.ref = this.dialogService.open(SendDocumentDialog, {
            header: 'Aggiungi un messaggio',
            width: '50%',
            height: '50%',
            contentStyle: { "overflow": "auto" },
            closable: true,
            autoZIndex: true,
            data: {
              templates$: this.templates$ 
            }
        });

    if (this.ref) {
      this.ref.onClose.subscribe((result: SendDocumentData) => {
        if (!result || !this.result?.id || !this.result?.recipientId) {
          return;
        }

        this.aiService
          .createSending$({
            extracted_document_id: this.result.id,
            recipient_id: this.result.recipientId,
            sent_at: this.resolveSentAt(result.orarioInvio.value).toISOString(),
            subject: result.templateName || `Invio documento ${this.result.name ?? ''}`.trim(),
            body: result.messaggio,
            template_id: result.templateId,
          })
          .subscribe({
            next: () => {
              const sentAt = this.resolveSentAt(result.orarioInvio.value);
              const newState = sentAt > new Date() ? State.Programmato : State.Inviato;
              if (this.result) {
                this.result = { ...this.result, state: newState };
                this.aiService.updateResult(this.result);
              }
              if (result.orarioInvio.value === 'now') {
                this.messageService.add({ severity: 'success', summary: 'Invio in corso' });
              } else {
                this.messageService.add({ severity: 'success', summary: 'Invio programmato', detail: result.orarioInvio.name });
              }
            },
            error: (error) => {
              console.error('Errore durante creazione invio:', error);
              this.messageService.add({ severity: 'error', summary: 'Errore durante invio documento' });
            },
          });
      });
    }
  }

  private resolveSentAt(optionValue: string): Date {
    const now = new Date();
    if (optionValue === 'now') {
      return now;
    }

    const scheduled = new Date(now);
    scheduled.setHours(9, 0, 0, 0);

    if (optionValue === 'tomorrow_9am') {
      scheduled.setDate(scheduled.getDate() + 1);
      return scheduled;
    }

    if (optionValue === 'day_after_9am') {
      scheduled.setDate(scheduled.getDate() + 2);
      return scheduled;
    }

    if (optionValue === 'monday_9am') {
      const day = scheduled.getDay();
      const daysUntilMonday = (8 - day) % 7 || 7;
      scheduled.setDate(scheduled.getDate() + daysUntilMonday);
      return scheduled;
    }

    return now;
  }

  enableEditing(): void{
    this.pendingModifications = {};
    this.isEditable = true;
  }

  cancelEditing(): void {
    this.pendingModifications = {};
    this.isEditable = false;
    this.messageService.add({severity:'info', summary: 'Modifiche annullate'});
  }

  get hasPendingModifications(): boolean {
    return Object.keys(this.pendingModifications).length > 0;
  }

  get hasRecipientMatch(): boolean {
    return (this.result?.recipientId ?? 0) > 0;
  }

  private normalizeValue(value: string | number | undefined | null): string {
    return value === undefined || value === null ? '' : String(value);
  }

  onFieldModified(event: { field: keyof ResultSplit; value: string | number | undefined }): void {
    const originalValue = this.result ? this.result[event.field] : undefined;
    const incoming = this.normalizeValue(event.value);
    const original = this.normalizeValue(originalValue as string | number | undefined);

    if (incoming === original) {
      const { [event.field]: _, ...rest } = this.pendingModifications;
      this.pendingModifications = rest;
      return;
    }

    this.pendingModifications = {
      ...this.pendingModifications,
      [event.field]: event.value,
    };
  }

  saveChanges(): void {
    if (!this.result) {
      return;
    }

    if (!this.hasPendingModifications) {
      this.isEditable = false;
      return;
    }

    const rangeUpdates = this.buildRangeUpdates(this.pendingModifications, this.result);
    const metadataUpdates = this.buildMetadataUpdates(this.pendingModifications);

    if (rangeUpdates && !this.isRangeValid(rangeUpdates, this.result)) {
      this.messageService.add({severity:'error', summary: 'Range pagine non valido'});
      return;
    }

    if (rangeUpdates && this.result.id) {
      this.aiService.modifyDocumentRange(this.result.id, rangeUpdates.page_start, rangeUpdates.page_end);
    }

    if (Object.keys(metadataUpdates).length > 0 && this.result.id) {
      this.aiService.updateDocumentMetadata(this.result.id, metadataUpdates);
    }

    Object.assign(this.result, this.pendingModifications);
    this.aiService.updateResult(this.result);
    this.pendingModifications = {};
    this.messageService.add({severity:'success', summary: 'Modifiche salvate'});
    this.isEditable = false;
  }

  private buildMetadataUpdates(modifications: Partial<ResultSplit>): Record<string, unknown> {
  // Solo i campi che il backend accetta in /metadata
  const METADATA_FIELDS: (keyof ResultSplit)[] = [
    'category', 'company', 'department', 'month_year', 'name'
  ];
  
  return Object.fromEntries(
    METADATA_FIELDS
      .filter(key => key in modifications)
      .map(key => [key, modifications[key]])
  );
}

  private buildRangeUpdates(
    modifications: Partial<ResultSplit>,
    current: ResultSplit
  ): { page_start: number; page_end: number } | null {
    const hasRangeUpdate = modifications.page_start !== undefined || modifications.page_end !== undefined;
    if (!hasRangeUpdate) {
      return null;
    }

    const pageStart = Number(modifications.page_start ?? current.page_start);
    const pageEnd = Number(modifications.page_end ?? current.page_end);

    if (Number.isNaN(pageStart) || Number.isNaN(pageEnd)) {
      return null;
    }

    return {
      page_start: pageStart,
      page_end: pageEnd,
    };
  }

  private isRangeValid(range: { page_start: number; page_end: number }, current: ResultSplit): boolean {
    const maxPages = Number(this.pages) > 0
      ? Number(this.pages)
      : Number(current.page_end) - Number(current.page_start) + 1;

    if (!Number.isFinite(maxPages) || maxPages < 1) {
      return false;
    }

    return (
      Number.isInteger(range.page_start) &&
      Number.isInteger(range.page_end) &&
      range.page_start >= 1 &&
      range.page_end >= 1 &&
      range.page_start <= range.page_end &&
      range.page_end <= maxPages
    );
  }
}
