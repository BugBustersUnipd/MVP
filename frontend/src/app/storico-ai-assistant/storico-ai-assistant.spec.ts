import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoricoAiAssistant } from './storico-ai-assistant';

describe('StoricoAiAssistant', () => {
  let component: StoricoAiAssistant;
  let fixture: ComponentFixture<StoricoAiAssistant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoricoAiAssistant]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoricoAiAssistant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
