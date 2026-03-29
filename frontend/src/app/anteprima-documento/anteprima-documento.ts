import { Component, DestroyRef, inject } from '@angular/core';
import { DocSummary } from '../components/doc-summary/doc-summary';
import { ExtractedEmployeeInfo, ExtractedEmployeeInfoRow } from '../components/extracted-employee-info/extracted-employee-info';
import { ResultSplit } from '../shared/models/result-split.model';
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
import { BehaviorSubject, combineLatest, map, Observable, of } from 'rxjs';
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
  // todo ho idea che diventaerà un observable prima o poi...(quando cambi le pagine estratte fa ripartire l'analisi...)
  result = (history.state?.result as ResultSplit | null) ?? null;
  pendingModifications: Partial<ResultSplit> = {};
  pages: number = history.state?.pages;
  extractedEmployeeRows: ExtractedEmployeeInfoRow[] = [];
  otherExtractedDocumentRows$: Observable<OtherExtractDocumentRow[]> = of([]);
  private removedOtherDocumentIds$ = new BehaviorSubject<number[]>([]);
  
  ngOnInit() {
    this.aiService.fetchTemplates();
    this.extractedEmployeeRows = this.buildExtractedEmployeeRows(this.result);
    const currentExtractedDocumentId = this.result?.id;

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
    this.aiService.getOriginalPdfById(1);//todo sostituire con id del documento 
  }

  handleOpenSplitPdf(): void {
    this.aiService.getPdfById(1);//todo sostituire con id del documento 
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
      this.ref.onClose.subscribe((selectedEmployee: SelectEmployeeDialogResult | undefined) => {
        if (!selectedEmployee || !this.result) {
          return;
        }

        this.result.recipientId = selectedEmployee.id;
        this.result.recipientName = selectedEmployee.name;
        this.result.recipientEmail = selectedEmployee.email || '';
        this.result.recipientCode = selectedEmployee.employeeCode || '';

        this.extractedEmployeeRows = this.buildExtractedEmployeeRows(this.result);
        this.aiService.updateResult(this.result);
        this.messageService.add({severity:'success', summary: 'Dipendente aggiornato'});
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

    const row: ExtractedEmployeeInfoRow = {
      name: result.recipientName ?? '',
      employeeCode: result.recipientCode ?? '',
      email: result.recipientEmail ?? '',
    };

    const isEmptyRow = Object.values(row).every((value) => !value?.trim());
    return isEmptyRow ? [] : [row];
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
      this.ref.onClose.subscribe((result: SendDocumentData) =>{
          if (result) {
         
              console.log(result.messaggio);
              console.log(result.orarioInvio.name);
              console.log(result.fileAttachments); // Array di File
              if (result.orarioInvio.value === 'now') {
                this.messageService.add({severity:'info', summary: 'Invio in corso'});
              } else 
                this.messageService.add({severity:'info', summary: 'Invio programmato', detail: result.orarioInvio.name });
          }

      });
    }
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

    Object.assign(this.result, this.pendingModifications);
    this.aiService.updateResult(this.result);
    this.pendingModifications = {};
    this.messageService.add({severity:'success', summary: 'Modifiche salvate'});
    this.isEditable = false;
  }
}
