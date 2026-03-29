import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Filters } from './filters';

describe('Filters', () => {
  let component: Filters;
  let fixture: ComponentFixture<Filters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Filters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Filters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit search value on search change', () => {
    const emitSpy = vi.spyOn(component.searchvalueChange, 'emit');
    component.searchvalue = 'Mario';

    component.onSearchChange();

    expect(emitSpy).toHaveBeenCalledWith('Mario');
  });

  it('should emit selected text option on change', () => {
    const emitSpy = vi.spyOn(component.selectedTextOptionChange, 'emit');
    component.selectedTextOption = 'HR';

    component.onTextOptionChange();

    expect(emitSpy).toHaveBeenCalledWith('HR');
  });

  it('should emit selected dates on date select', () => {
    const emitSpy = vi.spyOn(component.datesChange, 'emit');
    const start = new Date(2025, 0, 1);
    const end = new Date(2025, 0, 31);
    component.dates = [start, end];

    component.onDateSelect();

    expect(emitSpy).toHaveBeenCalledWith([start, end]);
  });
});
