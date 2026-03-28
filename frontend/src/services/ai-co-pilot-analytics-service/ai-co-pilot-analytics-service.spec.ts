import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AiCoPilotAnalyticsService } from './ai-co-pilot-analytics-service';
import { AnalyticsMetric } from '../analytics-abstract-service';

describe('AiCoPilotAnalyticsService', () => {
  let service: AiCoPilotAnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiCoPilotAnalyticsService);
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

    const request = httpMock.expectOne('/api/analytics/ai-copilot/metrics');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ periodoKey: 'sempre' });

    request.flush({
      status: 'success',
      data: {
        average_confidence: 89.28,
        average_human_intervention: 0,
        mapping_accuracy: 100.0,
        average_time_analyses: 6.71,
      },
    });

    expect(collected.at(-1)).toEqual([
      { label: 'PERCENTUALE CONFIDENZA MEDIA', value: '89.28%' },
      { label: 'PERCENTUALE HUMAN-IN-THE-LOOP', value: '0%' },
      { label: 'ACCURATEZZA MAPPING', value: '100%' },
      { label: 'TEMPI MEDI ANALISI', value: '6.71s' },
    ]);
  });

  it('should emit empty metrics on backend error', () => {
    const collected: AnalyticsMetric[][] = [];

    service.getAnalysis({ periodoKey: 'sempre' }).subscribe((metrics) => {
      collected.push(metrics);
    });

    const request = httpMock.expectOne('/api/analytics/ai-copilot/metrics');
    request.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(collected.at(-1)).toEqual([]);
  });
});
