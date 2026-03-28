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

    const request = httpMock.expectOne('/api/analytics/ai-assistant/metrics');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ periodoKey: 'sempre' });

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

    const request = httpMock.expectOne('/api/analytics/ai-assistant/metrics');
    request.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(collected.at(-1)).toEqual([]);
  });
});
