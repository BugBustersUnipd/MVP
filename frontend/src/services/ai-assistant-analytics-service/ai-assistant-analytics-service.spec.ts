import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AiAssistantAnalyticsService } from './ai-assistant-analytics-service';
import { AnalyticsMetric } from '../analytics-abstract-service';

describe('AiAssistantAnalyticsService', () => {
  let service: AiAssistantAnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiAssistantAnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call metrics endpoint and map backend payload', () => {
    const collected: AnalyticsMetric[][] = [];

    service.getAnalysis({ periodoKey: 'sempre' }).subscribe((metrics) => {
      collected.push(metrics);
    });

    const request = httpMock.expectOne('/ai_generator_data_analyst');
    expect(request.request.method).toBe('GET');

    request.flush({
      status: 'success',
      data: {
        prompt_amount: 65,
        average_rate_prompt: 6.86,
        average_regeneration_amount: 0.47,
        tone_usage: { Amichevole: 9 },
        style_usage: { Creativo: 10 },
      },
    });

    expect(collected.at(-1)).toEqual([
      { label: 'N. PROMPT GENERATI', value: 65 },
      { label: 'RATING MEDIO PROMPT', value: 6.86 },
      { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: 0.47 },
    ]);
  });

  it('should emit empty metrics on backend error', () => {
    const collected: AnalyticsMetric[][] = [];

    service.getAnalysis({ periodoKey: 'sempre' }).subscribe((metrics) => {
      collected.push(metrics);
    });

    const request = httpMock.expectOne('/ai_generator_data_analyst');
    request.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(collected.at(-1)).toEqual([]);
  });

  it('should send start/end date params when period has boundaries', () => {
    service.getAnalysis({ periodoKey: 'custom', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') }).subscribe();

    const request = httpMock.expectOne((r) =>
      r.url === '/ai_generator_data_analyst' &&
      r.params.has('start_date') &&
      r.params.has('end_date')
    );

    request.flush({
      status: 'success',
      data: {
        prompt_amount: 1,
        average_rate_prompt: 2,
        average_regeneration_amount: 3,
        tone_usage: {},
        style_usage: {},
      },
    });
  });

  it('should reset tone/style chart streams to empty on backend error', () => {
    let toneChart: any = null;
    let styleChart: any = null;

    service.getToneUsageChart().subscribe((v) => (toneChart = v));
    service.getStyleUsageChart().subscribe((v) => (styleChart = v));
    service.getAnalysis({ periodoKey: 'sempre' }).subscribe();

    const request = httpMock.expectOne('/ai_generator_data_analyst');
    request.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(toneChart).toEqual({ labels: [], values: [] });
    expect(styleChart).toEqual({ labels: [], values: [] });
  });

  it('should map missing analytics values to defaults', () => {
    const collected: AnalyticsMetric[][] = [];
    let toneChart: any = null;
    let styleChart: any = null;

    service.getToneUsageChart().subscribe((v) => (toneChart = v));
    service.getStyleUsageChart().subscribe((v) => (styleChart = v));
    service.getAnalysis({ periodoKey: 'sempre' }).subscribe((metrics) => {
      collected.push(metrics);
    });

    const request = httpMock.expectOne('/ai_generator_data_analyst');
    request.flush({
      status: 'success',
      data: {
        prompt_amount: undefined,
        average_rate_prompt: undefined,
        average_regeneration_amount: undefined,
        tone_usage: undefined,
        style_usage: { Informale: null },
      },
    } as any);

    expect(collected.at(-1)).toEqual([
      { label: 'N. PROMPT GENERATI', value: 0 },
      { label: 'RATING MEDIO PROMPT', value: 0 },
      { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: 0 },
    ]);
    expect(toneChart).toEqual({ labels: [], values: [] });
    expect(styleChart).toEqual({ labels: ['Informale'], values: [0] });
  });
});
