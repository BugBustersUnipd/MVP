import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { AiAssistantService } from './ai-assistant-service';
import { ResultAiAssistant } from '../../app/shared/models/result-ai-assistant.model';

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let httpMock: HttpTestingController;

  const sampleResult: ResultAiAssistant = {
    id: 12,
    title: 'Titolo',
    content: 'Contenuto',
    imagePath: null,
    tone: { id: 1, name: 'Formale', isActive: true },
    style: { id: 2, name: 'Sintetico', isActive: true },
    company: { id: 3, name: 'ACME' },
    data: new Date('2025-01-01'),
    prompt: 'Prompt',
    evaluation: 3,
    generatedDatumId: null,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiAssistantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch tones by company and update tones$', () => {
    let tonesValue: any[] = [];
    service.tones$.subscribe((value) => (tonesValue = value));

    service.fetchTonesByCompany(7);

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/tones');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('company_id')).toBe('7');

    req.flush({ tones: [{ id: 10, name: 'Amichevole' }] });
    expect(tonesValue).toEqual([{ id: 10, name: 'Amichevole', isActive: true }]);
  });

  it('should return empty tones when backend payload shape is not supported', () => {
    let tonesValue: any[] = [];
    service.tones$.subscribe((value) => (tonesValue = value));

    service.fetchTonesByCompany(5);

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/tones');
    req.flush([{ id: 55, name: 'Empatico' }]);

    expect(tonesValue).toEqual([]);
  });

  it('should return empty styles when backend payload shape is not supported', () => {
    let stylesValue: any[] = [];
    service.styles$.subscribe((value) => (stylesValue = value));

    service.fetchStylesByCompany(3);

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/styles');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('company_id')).toBe('3');

    req.flush([{ id: 20, name: 'Tecnico' }]);
    expect(stylesValue).toEqual([]);
  });

  it('should fetch styles by company when backend returns wrapped object', () => {
    let stylesValue: any[] = [];
    service.styles$.subscribe((value) => (stylesValue = value));

    service.fetchStylesByCompany(4);

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/styles');
    req.flush({ styles: [{ id: 42, name: 'Narrativo' }] });

    expect(stylesValue).toEqual([{ id: 42, name: 'Narrativo', isActive: true }]);
  });

  it('should fetch companies and update companies$', () => {
    let companiesValue: any[] = [];
    service.companies$.subscribe((value) => (companiesValue = value));

    service.fetchCompanies();

    const req = httpMock.expectOne('http://localhost:3000/lookups/companies');
    expect(req.request.method).toBe('GET');

    req.flush({ companies: [{ id: 1, name: 'TechCorp' }] });
    expect(companiesValue).toEqual([{ id: 1, name: 'TechCorp' }]);
  });

  it('should create tone and append it to tones$', () => {
    (service as any).tonesSubject.next([{ id: 1, name: 'Base' }]);

    let tonesValue: any[] = [];
    service.tones$.subscribe((value) => (tonesValue = value));

    service.newTone('Nuovo tono', 'Descrizione', 12);

    const req = httpMock.expectOne('http://localhost:3000/tones');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tone: {
        name: 'Nuovo tono',
        description: 'Descrizione',
        company_id: 12,
      },
    });

    req.flush({ id: 99, name: 'Nuovo tono' });
    expect(tonesValue).toEqual([
      { id: 1, name: 'Base' },
      { id: 99, name: 'Nuovo tono', isActive: true },
    ]);
  });

  it('should create style and append it to styles$', () => {
    (service as any).stylesSubject.next([{ id: 1, name: 'Base style' }]);

    let stylesValue: any[] = [];
    service.styles$.subscribe((value) => (stylesValue = value));

    service.newStyle('Nuovo stile', 'Descrizione stile', 15);

    const req = httpMock.expectOne('http://localhost:3000/styles');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      style: {
        name: 'Nuovo stile',
        description: 'Descrizione stile',
        company_id: 15,
      },
    });

    req.flush({ id: 88, name: 'Nuovo stile' });
    expect(stylesValue).toEqual([
      { id: 1, name: 'Base style' },
      { id: 88, name: 'Nuovo stile', isActive: true },
    ]);
  });

  it('should remove tone from tones$', () => {
    (service as any).tonesSubject.next([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);

    let tonesValue: any[] = [];
    service.tones$.subscribe((value) => (tonesValue = value));

    service.removeTone(1);

    const req = httpMock.expectOne('http://localhost:3000/tones/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });

    expect(tonesValue).toEqual([{ id: 2, name: 'B' }]);
  });

  it('should remove style from styles$', () => {
    (service as any).stylesSubject.next([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);

    let stylesValue: any[] = [];
    service.styles$.subscribe((value) => (stylesValue = value));

    service.removeStyle(2);

    const req = httpMock.expectOne('http://localhost:3000/styles/2');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });

    expect(stylesValue).toEqual([{ id: 1, name: 'A' }]);
  });

  it('should set and update current result evaluation', () => {
    let current: any = null;
    service.currentResult$.subscribe((value) => (current = value));

    service.setCurrentResult(sampleResult);
    service.setEvaluation(sampleResult.id, 5);

    const req = httpMock.expectOne('http://localhost:3000/generated_data/12/rating');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ok: true });

    expect(current).not.toBeNull();
    if (!current) {
      throw new Error('current result should be defined');
    }
    expect(current.id).toBe(sampleResult.id);
    expect(current.evaluation).toBe(5);
  });

  it('should ignore setEvaluation when current result is null', () => {
    let current: any = sampleResult;
    service.currentResult$.subscribe((value) => (current = value));
    service.setCurrentResult(null);

    service.setEvaluation(sampleResult.id, 4);

    expect(current).toBeNull();
  });

  it('should create post and append to results history', () => {
    let history: any = null;
    service.currentResultsHistory$.subscribe((value) => (history = value));

    service.setCurrentResult(sampleResult);
    service.createCurrentPost();

    const req = httpMock.expectOne('http://localhost:3000/posts');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 234 });

    expect(history).not.toBeNull();
    if (!history) {
      throw new Error('history should be defined');
    }
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(234);
  });

  it('should clear current result when setCurrentResult is called with null', () => {
    let current: any = sampleResult;
    service.currentResult$.subscribe((value) => (current = value));

    service.setCurrentResult(null);

    expect(current).toBeNull();
  });

  it('should update existing history item when current result emits same id', () => {
    const previous = { ...sampleResult, title: 'Vecchio' };
    (service as any).ResultsHistorySubject.next([previous]);

    service.setCurrentResult({ ...sampleResult, title: 'Nuovo titolo' });

    expect((service as any).ResultsHistorySubject.value).toEqual([
      expect.objectContaining({ id: sampleResult.id, title: 'Nuovo titolo' }),
    ]);
  });

  it('should publish pending result on reuse and requireGeneration', () => {
    let current: any = null;
    service.currentResult$.subscribe((value) => (current = value));

    service.reuse(sampleResult.tone, sampleResult.style, sampleResult.company, sampleResult.prompt);
    expect(current?.id).toBeNull();

    const reqFromReuse = httpMock.expectOne('http://localhost:3000/generated_data');
    expect(reqFromReuse.request.method).toBe('POST');
    reqFromReuse.flush({ id: 0 });

    service.requireGeneration('P', sampleResult.tone, sampleResult.style, sampleResult.company);
    expect(current?.id).toBeNull();

    const req = httpMock.expectOne('http://localhost:3000/generated_data');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      generation_datum: {
        prompt: 'P',
        company_id: 3,
        style_id: 2,
        tone_id: 1,
      },
    });

    req.flush({ id: 0 });
  });

  it('should keep pending result when generation request fails', () => {
    let current: any = null;
    service.currentResult$.subscribe((value) => (current = value));

    service.requireGeneration('Prompt errore', sampleResult.tone, sampleResult.style, sampleResult.company);

    const req = httpMock.expectOne('http://localhost:3000/generated_data');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(current?.id).toBeNull();
  });

  it('should ignore fetchResultsHistory when history already exists', () => {
    (service as any).ResultsHistorySubject.next([sampleResult]);
    service.fetchResultsHistory();
    expect((service as any).ResultsHistorySubject.value.length).toBe(1);
  });

  it('should set empty history on first fetchResultsHistory call', () => {
    (service as any).ResultsHistorySubject.next(null);
    service.fetchResultsHistory();

    const req = httpMock.expectOne('http://localhost:3000/posts');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect((service as any).ResultsHistorySubject.value).toEqual([]);
  });


  it('should handle websocket completed flow after generation creation', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    let current: any = null;
    service.currentResult$.subscribe((value) => (current = value));

    service.requireGeneration('Prompt websocket', sampleResult.tone, sampleResult.style, sampleResult.company);

    const req = httpMock.expectOne('http://localhost:3000/generated_data');
    req.flush({ id: 321 });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:3000/cable');

    ws.onopen?.({});
    expect(ws.send).toHaveBeenCalled();

    ws.onmessage?.({ data: JSON.stringify({ type: 'welcome' }) });
    ws.onmessage?.({
      data: JSON.stringify({
        message: { id: 999, status: 'completed', title: 'Wrong', text: 'Wrong' },
      }),
    });
    expect(current.generatedDatumId).toBe(321);

    ws.onmessage?.({
      data: JSON.stringify({
        message: { id: 321, status: 'completed', title: 'Titolo finale', text: 'Testo finale' },
      }),
    });

    expect(current.generatedDatumId).toBe(321);
    expect(current.title).toBe('Titolo finale');
    expect(current.content).toBe('Testo finale');
    expect(ws.close).toHaveBeenCalled();

    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should handle fetch tones error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.fetchTonesByCompany(3);

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/tones' && r.params.get('company_id') === '3');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle fetch styles error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.fetchStylesByCompany(3);

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/styles' && r.params.get('company_id') === '3');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle fetch companies error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.fetchCompanies();

    const req = httpMock.expectOne('http://localhost:3000/lookups/companies');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle new tone error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.newTone('Tone', 'Desc', 1);

    const req = httpMock.expectOne('http://localhost:3000/tones');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle new style error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.newStyle('Style', 'Desc', 1);

    const req = httpMock.expectOne('http://localhost:3000/styles');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle remove tone and style error branches', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.removeTone(1);
    const toneReq = httpMock.expectOne('http://localhost:3000/tones/1');
    toneReq.flush('err', { status: 500, statusText: 'Server Error' });

    service.removeStyle(2);
    const styleReq = httpMock.expectOne('http://localhost:3000/styles/2');
    styleReq.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
