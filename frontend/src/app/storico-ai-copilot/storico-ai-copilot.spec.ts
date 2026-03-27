import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoricoAiCopilot } from './storico-ai-copilot';

describe('StoricoAiCopilot', () => {
  let component: StoricoAiCopilot;
  let fixture: ComponentFixture<StoricoAiCopilot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoricoAiCopilot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoricoAiCopilot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
