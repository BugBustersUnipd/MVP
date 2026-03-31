import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { RiconoscimentoDocumenti } from './riconoscimento-documenti';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';
import { State } from '../shared/models/result-split.model';

describe('RiconoscimentoDocumenti', () => {
  let component: RiconoscimentoDocumenti;
  let fixture: ComponentFixture<RiconoscimentoDocumenti>;

  const history$ = new BehaviorSubject<any[]>([]);
  const sessionParents$ = new BehaviorSubject<any[]>([]);
  const parentNames$ = new BehaviorSubject<Record<number, string>>({});
  const parentPageCounts$ = new BehaviorSubject<Record<number, number>>({});
  const currentBatchParentIds$ = new BehaviorSubject<Set<number>>(new Set());

  const aiServiceMock = {
    confidence$: of(['0-20%']),
    category$: of(['Cedolini']),
    companies$: of([{ id: 1, name: 'ACME' }]),
    department$: of(['HR']),
    state$: of([State.DaValidare]),
    currentResultsHistory$: history$,
    currentSessionParents$: sessionParents$,
    currentBatchParentIds$: currentBatchParentIds$,
    currentParentNames$: parentNames$,
    currentParentPageCounts$: parentPageCounts$,
    fetchCategories: vi.fn(),
    fetchCompanies: vi.fn(),
    fetchDepartment: vi.fn(),
    fetchConfidence: vi.fn(),
    fetchState: vi.fn(),
  };

  beforeEach(async () => {
    history$.next([]);
    sessionParents$.next([]);
    currentBatchParentIds$.next(new Set());
    parentNames$.next({});

    aiServiceMock.fetchCategories.mockClear();
    aiServiceMock.fetchCompanies.mockClear();
    aiServiceMock.fetchDepartment.mockClear();
    aiServiceMock.fetchConfidence.mockClear();
    aiServiceMock.fetchState.mockClear();

    await TestBed.configureTestingModule({
      imports: [RiconoscimentoDocumenti],
      providers: [{ provide: AiCoPilotService, useValue: aiServiceMock }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RiconoscimentoDocumenti);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call all lookup fetch methods on init', () => {
    expect(aiServiceMock.fetchCategories).toHaveBeenCalled();
    expect(aiServiceMock.fetchCompanies).toHaveBeenCalled();
    expect(aiServiceMock.fetchDepartment).toHaveBeenCalled();
    expect(aiServiceMock.fetchConfidence).toHaveBeenCalled();
    expect(aiServiceMock.fetchState).toHaveBeenCalled();
  });

  it('should apply search and field filters', () => {
    const doc = {
      id: 1,
      parentId: 10,
      name: 'Cedolino Mario',
      confidence: '80-100%',
      category: 'Cedolini',
      state: State.DaValidare,
      company: 'ACME',
      department: 'HR',
      data: new Date('2025-01-10'),
      page_start: 1,
      page_end: 2,
      recipientName: 'Mario',
    };

    component.DocumentiSplittati = [doc as any];
    component.searchvalue = 'cedolino';
    component.selectedCategory = 'Cedolini';
    component.selectedState = State.DaValidare;
    component.selectedCompany = 'ACME';
    component.selectedDepartment = 'HR';
    component.selectedconfidence = '80-100%';
    component.dates = [new Date('2025-01-01'), new Date('2025-01-31')];

    component.applyFilters();

    expect(component.DocumentiSplittatiFiltrati.length).toBe(1);
    expect(component.nestedDocuments.length).toBe(1);
  });

  it('should include session parent when no active filters', () => {
    component.DocumentiSplittati = [];
    component.searchvalue = '';
    component.dates = undefined;
    component.selectedCategory = null;
    component.selectedState = null;
    component.selectedCompany = null;
    component.selectedDepartment = null;
    component.selectedconfidence = null;

    component.sessionParents = [{ id: 99, name: 'Upload in coda', state: 'in_coda', ResultSplit: [] } as any];
    component.applyFilters();

    expect(component.nestedDocuments.some((d) => d.id === 99)).toBe(true);
  });

  it('should update filters via handlers', () => {
    component.onSearchChange('abc');
    component.onCategoryChange('Cedolini');
    component.onCompanyChange('ACME');
    component.onDepartmentChange('HR');
    component.onStateChange(State.DaValidare);
    component.onConfidenceChange('80-100%');
    component.onDateChange([new Date('2025-01-01'), new Date('2025-01-31')]);

    expect(component.searchvalue).toBe('abc');
    expect(component.selectedCategory).toBe('Cedolini');
    expect(component.selectedCompany).toBe('ACME');
    expect(component.selectedDepartment).toBe('HR');
    expect(component.selectedState).toBe(State.DaValidare);
    expect(component.selectedconfidence).toBe('80-100%');
    expect(component.dates?.length).toBe(2);
  });

  it('should map split states into document states through nested documents', () => {
    component.parentNames = { 10: 'Documento Origine' };
    component.DocumentiSplittati = [
      {
        id: 1,
        parentId: 10,
        name: 'Split',
        confidence: 80,
        category: 'Cedolini',
        state: State.DaValidare,
        company: 'ACME',
        department: 'HR',
        data: new Date('2025-01-10'),
        page_start: 1,
        page_end: 2,
        recipientName: 'Mario',
      } as any,
    ];

    component.applyFilters();

    expect(component.nestedDocuments[0].state).toBe('In elaborazione');
    expect(component.nestedDocuments[0].name).toContain('Documento Origine');
  });
});
