import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { DocSummary } from './doc-summary';

describe('DocSummary', () => {
  let component: DocSummary;
  let fixture: ComponentFixture<DocSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prefer pending modification value over original result', () => {
    component.result = { firstName: 'Mario' } as any;
    component.pendingModifications = { firstName: 'Luigi' } as any;

    const value = component.getFieldValue('firstName' as any);

    expect(value).toBe('Luigi');
  });

  it('should use original value when no pending override exists', () => {
    component.result = { firstName: 'Mario' } as any;
    component.pendingModifications = {};

    const value = component.getFieldValue('firstName' as any);

    expect(value).toBe('Mario');
  });

  it('should return fallback when both pending and original are empty', () => {
    component.result = { firstName: '' } as any;
    component.pendingModifications = {};

    const value = component.getFieldValue('firstName' as any, 'N/D');

    expect(value).toBe('N/D');
  });

  it('should emit field modification payload', () => {
    const emitSpy = vi.spyOn(component.fieldModified, 'emit');

    component.onFieldChange('firstName' as any, 'Marco');

    expect(emitSpy).toHaveBeenCalledWith({ field: 'firstName', value: 'Marco' });
  });

  it('should format month_year as MM/YYYY', () => {
    component.result = { month_year: '2026-02-20' } as any;
    expect(component.getMonthYearValue()).toBe('02/2026');

    component.pendingModifications = { month_year: '3/2025' } as any;
    expect(component.getMonthYearValue()).toBe('03/2025');
  });
});
