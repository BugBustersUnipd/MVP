import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Filters } from '../components/filters/filters';
import { Tables } from '../components/tables/tables';
import { StoricoAiCopilot } from './storico-ai-copilot';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';
import { ResultSplit, State } from '../shared/models/result-split.model';

describe('StoricoAiCopilot', () => {
  let component: StoricoAiCopilot;
  let fixture: ComponentFixture<StoricoAiCopilot>;
  let history$: BehaviorSubject<any[]>;
  let parentNames$: BehaviorSubject<Record<number, string>>;
  let parentPageCounts$: BehaviorSubject<Record<number, number>>;
  let companies$: BehaviorSubject<any[]>;

  const aiCoPilotServiceMock = {
    currentResultsHistory$: null as any,
    currentParentNames$: null as any,
    currentParentPageCounts$: null as any,
    companies$: null as any,
    fetchHistoryResults: vi.fn(),
    fetchCompanies: vi.fn(),
    deleteUploadedDocument: vi.fn(),
    retryExtractedDocumentProcessing: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    history$ = new BehaviorSubject<any[]>([]);
    parentNames$ = new BehaviorSubject<Record<number, string>>({});
    parentPageCounts$ = new BehaviorSubject<Record<number, number>>({});
    companies$ = new BehaviorSubject<any[]>([]);
    aiCoPilotServiceMock.currentResultsHistory$ = history$;
    aiCoPilotServiceMock.currentParentNames$ = parentNames$;
    aiCoPilotServiceMock.currentParentPageCounts$ = parentPageCounts$;
    aiCoPilotServiceMock.companies$ = companies$;
    aiCoPilotServiceMock.fetchHistoryResults.mockClear();
    aiCoPilotServiceMock.fetchCompanies.mockClear();
    routerMock.navigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [StoricoAiCopilot],
      providers: [
        provideRouter([]),
        { provide: AiCoPilotService, useValue: aiCoPilotServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoricoAiCopilot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize lists from service streams', () => {
    history$.next([
      {
        id: 1,
        parentId: 10,
        company: 'ACME',
        category: 'Cedolini',
        name: 'Split originale',
        confidence: 82,
        recipient: {
          recipientId: 1,
          recipientName: 'Mario',
          rawRecipientName: 'Mario',
          recipientEmail: 'mario@example.com',
          recipientCode: 'A1',
        },
        fieldConfidences: {},
        state: State.DaValidare,
        data: new Date('2025-01-10'),
        data_interna: new Date('2025-01-10'),
        time_Analysis: 10,
        page_start: 1,
        page_end: 1,
        department: 'HR',
        reason: 'Payroll',
        month_year: '01/2025',
      },
    ] as any);
    parentNames$.next({ 10: 'Documento originale' });
    parentPageCounts$.next({ 10: 6 });
    companies$.next([{ id: 1, name: 'ACME' }]);

    expect(aiCoPilotServiceMock.fetchHistoryResults).toHaveBeenCalled();
    expect(aiCoPilotServiceMock.fetchCompanies).toHaveBeenCalled();
    expect(component.Documents.length).toBe(1);
    expect((component.Documents[0] as any).name).toBe('Documento originale');
    expect(component.DocumentType).toEqual(['Cedolini']);
    expect(component.Companies).toEqual(['ACME']);
  });

  it('should apply filters by text, company, document and date', () => {
    component.Documents = [
      {
        id: 1,
        parentId: 10,
        company: 'ACME',
        category: 'Cedolini',
        name: 'Doc 1',
        confidence: 80,
        recipient: {
          recipientId: 10,
          recipientName: 'Mario Rossi',
          rawRecipientName: 'Mario Rossi',
          recipientEmail: 'mario.rossi@example.com',
          recipientCode: 'M10',
        },
        fieldConfidences: {},
        state: State.DaValidare,
        data: new Date('2025-01-10'),
        data_interna: new Date('2025-01-10'),
        time_Analysis: 20,
        page_start: 1,
        page_end: 1,
        department: 'HR',
        reason: 'Payroll',
        month_year: '01/2025',
      },
    ] as any;

    (component as any).documentsSubject.next(component.Documents);

    component.onSearchChange('doc');
    component.onCompanyChange('ACME');
    component.onDocumentChange('Cedolini');
    component.onDateChange([new Date('2025-01-01'), new Date('2025-01-31')]);

    let rows: ResultSplit[] = [];
    component.FilteredDocuments$.subscribe((value) => (rows = value));
    expect(rows.length).toBe(1);
  });

  it('should navigate to result when filtered row has a matching split', () => {
    (component as any).resultSplits = [
      {
        id: 9,
        parentId: 4,
        name: 'Split',
        company: 'A',
        category: 'C',
        confidence: 70,
        recipient: {
          recipientId: 11,
          recipientName: 'R',
          rawRecipientName: 'R',
          recipientEmail: 'r@example.com',
          recipientCode: 'R1',
        },
        fieldConfidences: {},
        state: State.Pronto,
        data: new Date('2025-01-10'),
        data_interna: new Date('2025-01-10'),
        time_Analysis: 5,
        page_start: 1,
        page_end: 1,
        department: 'D',
        reason: 'Reason',
        month_year: '01/2025',
      },
    ] as any;
    (component as any).parentPageCounts = { 4: 3 };
    const selectedRow =
      {
        id: 9,
        parentId: 4,
        name: 'D',
        company: 'A',
        category: 'C',
        confidence: 70,
        recipient: {
          recipientId: 11,
          recipientName: 'R',
          rawRecipientName: 'R',
          recipientEmail: 'r@example.com',
          recipientCode: 'R1',
        },
        fieldConfidences: {},
        state: State.Pronto,
        data: new Date(),
        data_interna: new Date(),
        time_Analysis: 5,
        page_start: 1,
        page_end: 1,
        department: 'D',
        reason: 'Reason',
        month_year: '01/2025',
      } as any;

    component.navigateToResult(selectedRow);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/anteprima-documento'], {
      state: {
        result: expect.objectContaining({ id: 9, parentId: 4 }),
        pages: 3,
      },
    });
  });

  it('should handle template filter events and update local filter fields', () => {
    fixture.detectChanges();
    const filters = fixture.debugElement.queryAll(By.directive(Filters));

    filters[0].componentInstance.searchvalueChange.emit('ricerca');
    filters[1].componentInstance.datesChange.emit([new Date('2025-01-01'), new Date('2025-01-31')]);
    filters[2].componentInstance.selectedTextOptionChange.emit('Cedolini');
    filters[3].componentInstance.selectedTextOptionChange.emit('ACME');

    expect(component.searchvalue).toBe('ricerca');
    expect(component.dates?.length).toBe(2);
    expect(component.selectedDocument).toBe('Cedolini');
    expect(component.selectedCompany).toBe('ACME');
  });

  it('should handle navigate action emitted by table title click', () => {
    const navSpy = vi.spyOn(component, 'navigateToResult');
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(Tables));
    const row = {
      id: 9,
      parentId: 4,
    } as ResultSplit;
    table.componentInstance.titleClick.emit(row);

    expect(navSpy).toHaveBeenCalledWith(row);
  });

  it('should delegate delete action from menu', () => {
    const row = { id: 99, parentId: 7, state: State.Pronto } as ResultSplit;

    component.onTableMenuAction({ row, item: { label: 'Elimina' } });

    expect(aiCoPilotServiceMock.deleteUploadedDocument).toHaveBeenCalledWith(7);
  });

  it('should retry only failed rows from menu', () => {
    const failedRow = { id: 55, parentId: 1, state: State.Failed } as ResultSplit;
    const readyRow = { id: 56, parentId: 1, state: State.Pronto } as ResultSplit;

    component.onTableMenuAction({ row: failedRow, item: { label: 'Riprova' } });
    component.onTableMenuAction({ row: readyRow, item: { label: 'Riprova' } });

    expect(aiCoPilotServiceMock.retryExtractedDocumentProcessing).toHaveBeenCalledTimes(1);
    expect(aiCoPilotServiceMock.retryExtractedDocumentProcessing).toHaveBeenCalledWith(55);
  });
});
