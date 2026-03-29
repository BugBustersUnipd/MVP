import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Button } from '../components/button/button';
import { Filters } from '../components/filters/filters';
import { Tables } from '../components/tables/tables';
import { StoricoAiAssistant } from './storico-ai-assistant';
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';

describe('StoricoAiAssistant', () => {
  let component: StoricoAiAssistant;
  let fixture: ComponentFixture<StoricoAiAssistant>;
  let tones$: BehaviorSubject<any[]>;
  let styles$: BehaviorSubject<any[]>;
  let history$: BehaviorSubject<any[]>;

  const aiAssistantServiceMock = {
    tones$: null as any,
    styles$: null as any,
    currentResultsHistory$: null as any,
    fetchTonesByCompany: vi.fn(),
    fetchStylesByCompany: vi.fn(),
    fetchResultsHistory: vi.fn(),
    setCurrentResult: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    tones$ = new BehaviorSubject<any[]>([]);
    styles$ = new BehaviorSubject<any[]>([]);
    history$ = new BehaviorSubject<any[]>([]);
    aiAssistantServiceMock.tones$ = tones$;
    aiAssistantServiceMock.styles$ = styles$;
    aiAssistantServiceMock.currentResultsHistory$ = history$;
    aiAssistantServiceMock.fetchTonesByCompany.mockClear();
    aiAssistantServiceMock.fetchStylesByCompany.mockClear();
    aiAssistantServiceMock.fetchResultsHistory.mockClear();
    aiAssistantServiceMock.setCurrentResult.mockClear();
    routerMock.navigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [StoricoAiAssistant],
      providers: [
        provideRouter([]),
        { provide: AiAssistantService, useValue: aiAssistantServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoricoAiAssistant);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tones styles and history on init', () => {
    tones$.next([{ id: 1, name: 'Formale' }]);
    styles$.next([{ id: 2, name: 'Sintetico' }]);
    history$.next([
      {
        id: 1,
        title: 'T',
        prompt: 'Prompt lungo',
        tone: { id: 1, name: 'Formale' },
        style: { id: 2, name: 'Sintetico' },
        data: new Date('2025-01-01'),
        content: 'Contenuto',
        evaluation: 3,
      },
    ]);

    expect(aiAssistantServiceMock.fetchTonesByCompany).toHaveBeenCalledWith(1);
    expect(aiAssistantServiceMock.fetchStylesByCompany).toHaveBeenCalledWith(1);
    expect(aiAssistantServiceMock.fetchResultsHistory).toHaveBeenCalled();
    expect(component.tonoOptions.length).toBe(1);
    expect(component.stileOptions.length).toBe(1);
    expect(component.GenerazioniFiltrate.length).toBe(1);
  });

  it('should apply search and dropdown filters', () => {
    component.Generazioni = [
      {
        id: 1,
        title: 'A',
        prompt: 'Prompt cedolino',
        tone: { id: 1, name: 'Formale' },
        style: { id: 2, name: 'Sintetico' },
        data: new Date('2025-01-10'),
        content: 'Contenuto',
        evaluation: 3,
      } as any,
    ];
    component.tonoOptions = [{ id: 1, name: 'Formale' }] as any;
    component.stileOptions = [{ id: 2, name: 'Sintetico' }] as any;

    component.onSearchChange('cedolino');
    component.onTonoChange(1);
    component.onStileChange(2);

    expect(component.GenerazioniFiltrate.length).toBe(1);
  });

  it('should filter by date range', () => {
    component.Generazioni = [
      { id: 1, prompt: 'A', tone: { name: 'x' }, style: { name: 'y' }, content: 'c', data: new Date('2025-01-05') } as any,
      { id: 2, prompt: 'B', tone: { name: 'x' }, style: { name: 'y' }, content: 'c', data: new Date('2025-03-05') } as any,
    ];

    component.onDateChange([new Date('2025-01-01'), new Date('2025-01-31')]);

    expect(component.GenerazioniFiltrate.length).toBe(1);
    expect(component.GenerazioniFiltrate[0].id).toBe(1);
  });

  it('should navigate to generatore and result detail', () => {
    component.NavigateToGeneratore();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/generatore']);

    const row = {
      id: 5,
      title: 'R',
      prompt: 'Prompt',
      tone: { id: 1, name: 'Formale' },
      style: { id: 2, name: 'Sintetico' },
      data: new Date('2025-01-01'),
      content: 'Contenuto',
      evaluation: 3,
    } as any;

    component.openGenerationResult(row);
    expect(aiAssistantServiceMock.setCurrentResult).toHaveBeenCalledWith(row);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/risultato-generazione'], { state: { result: row } });
  });

  it('should handle template filter events and update local filter fields', () => {
    fixture.detectChanges();
    const filters = fixture.debugElement.queryAll(By.directive(Filters));

    filters[0].componentInstance.searchvalueChange.emit('query');
    filters[1].componentInstance.datesChange.emit([new Date('2025-01-01'), new Date('2025-01-31')]);
    filters[2].componentInstance.selectedTextOptionChange.emit(1);
    filters[3].componentInstance.selectedTextOptionChange.emit(2);

    expect(component.searchvalue).toBe('query');
    expect(component.dates?.length).toBe(2);
    expect(component.selectedTono).toBe(1);
    expect(component.selectedStile).toBe(2);
  });

  it('should handle template events from tables and button', () => {
    const navSpy = vi.spyOn(component, 'NavigateToGeneratore');
    const openSpy = vi.spyOn(component, 'openGenerationResult');
    const row = { id: 77 } as any;
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(Tables));
    table.componentInstance.titleClick.emit(row);

    const button = fixture.debugElement.query(By.directive(Button));
    button.componentInstance.action.emit();

    expect(openSpy).toHaveBeenCalledWith(row);
    expect(navSpy).toHaveBeenCalledOnce();
  });
});
