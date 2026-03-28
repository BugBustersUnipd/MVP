import { TestBed } from '@angular/core/testing';

import { AiCoPilotService } from './ai-co-pilot-service';

describe('AiCoPilotService', () => {
  let service: AiCoPilotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiCoPilotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
