import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Button } from '../components/button/button';
import { Filters } from '../components/filters/filters';
import { StoricoAiCopilot } from './storico-ai-copilot';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';

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
        name: 'Split 1',
        confidence: 82,
        recipientName: 'Mario',
        state: 'Da validare',
        data: new Date('2025-01-10'),
      },
    ] as any);
    parentNames$.next({ 10: 'Documento originale' });
    companies$.next([{ id: 1, name: 'ACME' }]);

    expect(aiCoPilotServiceMock.fetchHistoryResults).toHaveBeenCalled();
    expect(aiCoPilotServiceMock.fetchCompanies).toHaveBeenCalled();
    expect(component.Documents.length).toBe(1);
    expect(component.Companies).toEqual(['ACME']);
  });

  it('should apply filters by text, company, document and date', () => {
    component.Documents = [
      {
        Company: 'ACME',
        TypeofDocument: 'Cedolini',
        DocumentName: 'Doc 1',
        Id: '10.1',
        SplitId: 1,
        Confidence: '80%',
        Recepient: 'Mario Rossi',
        State: 'Da validare' as any,
        Data: new Date('2025-01-10'),
      },
    ];

    component.onSearchChange('doc');
    component.onCompanyChange('ACME');
    component.onDocumentChange('Cedolini');
    component.onDateChange([new Date('2025-01-01'), new Date('2025-01-31')]);

    expect(component.FilteredDocuments.length).toBe(1);
  });

  it('should navigate to result when filtered row has a matching split', () => {
    (component as any).resultSplits = [
      {
        id: 9,
        parentId: 4,
      },
    ];
    component.FilteredDocuments = [
      {
        Company: 'A',
        TypeofDocument: 'C',
        DocumentName: 'D',
        Id: '4.9',
        SplitId: 9,
        Confidence: '70%',
        Recepient: 'R',
        State: 'Pronto' as any,
        Data: new Date(),
      },
    ];

    component.navigateToResult();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/anteprima-documento'], {
      state: {
        result: { id: 9, parentId: 4 },
        pages: component.pages,
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

  it('should handle navigate action emitted by template button', () => {
    const navSpy = vi.spyOn(component, 'navigateToResult');
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.directive(Button));
    button.componentInstance.action.emit();

    expect(navSpy).toHaveBeenCalledOnce();
  });
});
