import { TestBed } from '@angular/core/testing';

import { AiCoPilotAnalyticsService } from './ai-co-pilot-analytics-service';

describe('AiCoPilotAnalyticsService', () => {
  let service: AiCoPilotAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiCoPilotAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
