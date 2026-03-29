import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { Button } from '../components/button/button';
import { DocSummary } from '../components/doc-summary/doc-summary';
import { ExtractedEmployeeInfo } from '../components/extracted-employee-info/extracted-employee-info';
import { OtherExtractDocuments } from '../components/other-extraxt-documents/other-extract-documents';
import { AnteprimaDocumento } from './anteprima-documento';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';
import { DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

describe('AnteprimaDocumento', () => {
  let component: AnteprimaDocumento;
  let fixture: ComponentFixture<AnteprimaDocumento>;

  const aiServiceMock = {
    templates$: of([{ name: 'T', content: 'C' }]),
    otherExtractedDocuments$: new BehaviorSubject<any[]>([]),
    employees$: of([{ id: 1, name: 'Mario' }]),
    fetchTemplates: vi.fn(),
    getDocumentsByParent: vi.fn(),
    getOriginalPdfById: vi.fn(),
    getPdfById: vi.fn(),
    fetchEmployeesByCompany: vi.fn(),
    updateResult: vi.fn(),
  };

  const dialogRefMock = {
    onClose: of(undefined),
  };

  const dialogServiceMock = {
    open: vi.fn(() => dialogRefMock as any),
  };

  const messageServiceMock = {
    add: vi.fn(),
  };

  beforeEach(async () => {
    history.replaceState(
      {
        result: {
          id: 1,
          parentId: 11,
          recipientId: 2,
          recipientName: 'Mario Rossi',
          recipientEmail: 'mario@test.com',
          recipientCode: 'EMP-1',
          company: 'ACME',
          department: 'HR',
          category: 'Cedolini',
          confidence: 80,
          state: 'Da Validare',
          data: new Date('2025-01-01'),
          page_start: 1,
          page_end: 2,
          name: 'Doc 1',
        },
        pages: 10,
      },
      '',
    );

    aiServiceMock.fetchTemplates.mockClear();
    aiServiceMock.getDocumentsByParent.mockClear();
    aiServiceMock.getOriginalPdfById.mockClear();
    aiServiceMock.getPdfById.mockClear();
    aiServiceMock.fetchEmployeesByCompany.mockClear();
    aiServiceMock.updateResult.mockClear();
    dialogServiceMock.open.mockClear();
    messageServiceMock.add.mockClear();

    await TestBed.configureTestingModule({
      imports: [AnteprimaDocumento],
      providers: [
        { provide: AiCoPilotService, useValue: aiServiceMock },
        { provide: DialogService, useValue: dialogServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnteprimaDocumento);
    component = fixture.componentInstance;
    component.dialogService = dialogServiceMock as any;
    component.messageService = messageServiceMock as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch templates and sibling docs on init', () => {
    expect(aiServiceMock.fetchTemplates).toHaveBeenCalledTimes(1);
    expect(aiServiceMock.getDocumentsByParent).toHaveBeenCalledWith(11, 1);
    expect(component.extractedEmployeeRows.length).toBe(1);
  });

  it('should remove rows from extracted and other tables', () => {
    let otherRows: any[] = [];
    component.otherExtractedDocumentRows$.subscribe((rows) => {
      otherRows = rows;
    });

    component.extractedEmployeeRows = [{ name: 'A', email: 'a@a', employeeCode: '1' }];
    aiServiceMock.otherExtractedDocuments$.next([{ id: 1, recipientName: 'Mario', confidence: 80 }]);

    component.handleRemoveExtractedEmployeeRow(0);
    component.handleRemoveOtherExtractedDocumentRow(1);

    expect(component.extractedEmployeeRows).toEqual([]);
    expect(otherRows).toEqual([]);
  });

  it('should call open pdf handlers', () => {
    component.handleOpenOriginalPdf();
    component.handleOpenSplitPdf();

    expect(aiServiceMock.getOriginalPdfById).toHaveBeenCalledWith(1);
    expect(aiServiceMock.getPdfById).toHaveBeenCalledWith(1);
  });

  it('should enter edit mode and cancel editing', () => {
    component.enableEditing();
    expect(component.isEditable).toBe(true);

    component.onFieldModified({ field: 'recipientName' as any, value: 'Nuovo nome' });
    expect(component.hasPendingModifications).toBe(true);

    component.cancelEditing();
    expect(component.isEditable).toBe(false);
    expect(component.hasPendingModifications).toBe(false);
    expect(messageServiceMock.add).toHaveBeenCalled();
  });

  it('should save changes and call updateResult', () => {
    component.enableEditing();
    component.onFieldModified({ field: 'recipientName' as any, value: 'Nuovo Nome' });
    component.saveChanges();

    expect(aiServiceMock.updateResult).toHaveBeenCalledTimes(1);
    expect(component.isEditable).toBe(false);
    expect(component.hasPendingModifications).toBe(false);
  });

  it('should open send dialog', () => {
    component.showDialog();
    expect(dialogServiceMock.open).toHaveBeenCalled();
  });

  it('should react to doc-summary output bindings in template', () => {
    const fieldSpy = vi.spyOn(component, 'onFieldModified');
    const openOriginalSpy = vi.spyOn(component, 'handleOpenOriginalPdf');
    const openSplitSpy = vi.spyOn(component, 'handleOpenSplitPdf');
    fixture.detectChanges();

    const docSummary = fixture.debugElement.query(By.directive(DocSummary));
    docSummary.componentInstance.fieldModified.emit({ field: 'recipientName', value: 'Nuovo nome' });
    docSummary.componentInstance.openOriginalPdf.emit();
    docSummary.componentInstance.openSplitPdf.emit();

    expect(fieldSpy).toHaveBeenCalledWith({ field: 'recipientName', value: 'Nuovo nome' });
    expect(openOriginalSpy).toHaveBeenCalledOnce();
    expect(openSplitSpy).toHaveBeenCalledOnce();
  });

  it('should react to extracted and other documents output bindings in template', () => {
    const editSpy = vi.spyOn(component, 'handleEditExtractedEmployeeInfo');
    const removeExtractedSpy = vi.spyOn(component, 'handleRemoveExtractedEmployeeRow');
    const removeOtherSpy = vi.spyOn(component, 'handleRemoveOtherExtractedDocumentRow');
    fixture.detectChanges();

    const extracted = fixture.debugElement.query(By.directive(ExtractedEmployeeInfo));
    extracted.componentInstance.editRequested.emit();
    extracted.componentInstance.rowRemoved.emit(0);

    const other = fixture.debugElement.query(By.directive(OtherExtractDocuments));
    other.componentInstance.rowRemoved.emit(1);

    expect(editSpy).toHaveBeenCalledOnce();
    expect(removeExtractedSpy).toHaveBeenCalledWith(0);
    expect(removeOtherSpy).toHaveBeenCalledWith(1);
  });

  it('should handle send button action from template', () => {
    const showDialogSpy = vi.spyOn(component, 'showDialog');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.directive(Button));
    buttons.at(-1)?.componentInstance.action.emit();

    expect(showDialogSpy).toHaveBeenCalledOnce();
  });
});
