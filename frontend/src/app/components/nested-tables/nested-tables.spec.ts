import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentState } from '../../shared/models/result-ai-copilot.model';

import { NestedTables } from './nested-tables';

describe('NestedTables', () => {
  let component: NestedTables;
  let fixture: ComponentFixture<NestedTables>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NestedTables]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NestedTables);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map completed state to success class', () => {
    expect(component.getSeverity(DocumentState.Completato)).toBe('class-success');
  });

  it('should map in-progress and queued states', () => {
    expect(component.getSeverity(DocumentState.InElaborazione)).toBe('class-elaboration');
    expect(component.getSeverity(DocumentState.InCoda)).toBe('class-pending');
  });

  it('should map unknown state to default class', () => {
    expect(component.getSeverity('unknown' as DocumentState)).toBe('class-default');
  });
});
