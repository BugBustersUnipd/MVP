import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { DateRangePicker } from './date-range-picker';

describe('DateRangePicker', () => {
  let component: DateRangePicker;
  let fixture: ComponentFixture<DateRangePicker>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DateRangePicker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateRangePicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return placeholder label when no dates or period', () => {
    component.placeholderDefault = 'Seleziona periodo';
    component.selectedPeriodo = null;
    component.dates = undefined;

    expect(component.getLabel()).toBe('Seleziona periodo');
  });

  it('should return selected period label when present', () => {
    component.selectedPeriodo = { name: 'Questo mese' };
    component.dates = undefined;

    expect(component.getLabel()).toBe('Questo mese');
  });

  it('should format label from selected date range', () => {
    const d1 = new Date('2025-01-01T00:00:00.000Z');
    const d2 = new Date('2025-01-15T00:00:00.000Z');
    component.dates = [d1, d2];

    expect(component.getLabel()).toContain(' - ');
  });

  it('should emit undefined dates for Sempre period', () => {
    const emitSpy = vi.spyOn(component.rangeChange, 'emit');
    component.onPeriodoChange({ name: 'Sempre' });

    expect(component.dates).toBeUndefined();
    expect(emitSpy).toHaveBeenCalledWith(undefined);
  });

  it('should set range for Questo mese', () => {
    const emitSpy = vi.spyOn(component.rangeChange, 'emit');
    component.onPeriodoChange({ name: 'Questo mese' });

    expect(component.dates?.length).toBe(2);
    expect(component.selectedPeriodo?.name).toBe('Questo mese');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should set range for Ultime 2 settimane', () => {
    component.onPeriodoChange({ name: 'Ultime 2 settimane' });
    expect(component.dates?.length).toBe(2);
  });

  it('should set range for Ultimi 3 mesi', () => {
    component.onPeriodoChange({ name: 'Ultimi 3 mesi' });
    expect(component.dates?.length).toBe(2);
  });

  it('should set range for Ultimo anno', () => {
    component.onPeriodoChange({ name: 'Ultimo anno' });
    expect(component.dates?.length).toBe(2);
  });

  it('should emit manual range and clear selected period', () => {
    const emitSpy = vi.spyOn(component.rangeChange, 'emit');
    component.selectedPeriodo = { name: 'Questo mese' };
    component.dates = [new Date('2025-01-01'), new Date('2025-01-02')];

    component.onDateSelect();

    expect(component.selectedPeriodo).toBeNull();
    expect(emitSpy).toHaveBeenCalledWith(component.dates);
  });

  it('should not emit when manual selection is incomplete', () => {
    const emitSpy = vi.spyOn(component.rangeChange, 'emit');
    component.dates = [new Date('2025-01-01')];

    component.onDateSelect();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should not emit when end date is missing', () => {
    const emitSpy = vi.spyOn(component.rangeChange, 'emit');
    component.dates = [new Date('2025-01-01'), undefined as unknown as Date];

    component.onDateSelect();

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
