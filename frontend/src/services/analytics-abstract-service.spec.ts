import { TestBed } from '@angular/core/testing';

import { AnalyticsAbstractService } from './analytics-abstract-service';

describe('AnalyticsAbstractService', () => {
  let service: AnalyticsAbstractService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsAbstractService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
