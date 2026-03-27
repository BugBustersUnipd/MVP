import { TestBed } from '@angular/core/testing';

import { AiAssistantAnalyticsService } from './ai-assistant-analytics-service';

describe('AiAssistantAnalyticsService', () => {
  let service: AiAssistantAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiAssistantAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
