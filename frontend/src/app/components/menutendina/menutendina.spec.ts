import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Menutendina } from './menutendina';

describe('Menutendina', () => {
  let component: Menutendina;
  let fixture: ComponentFixture<Menutendina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menutendina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Menutendina);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should do nothing on remove when options is not set', () => {
    const emitSpy = vi.spyOn(component.selectedChange, 'emit');
    component.options = undefined;

    component.removeOption({ id: 1, name: 'A' }, new Event('click'));

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should remove option and clear selected when removed item is selected', () => {
    const first = { id: 1, name: 'A' };
    const second = { id: 2, name: 'B' };
    const emitSpy = vi.spyOn(component.selectedChange, 'emit');
    component.options = [first, second];
    component.selected = first;

    component.removeOption(first, new Event('click'));

    expect(component.options).toEqual([second]);
    expect(component.selected).toBeNull();
    expect(emitSpy).toHaveBeenCalledWith(null);
  });

  it('should emit add new request', () => {
    const emitSpy = vi.spyOn(component.addNew, 'emit');

    component.emitAddNew();

    expect(emitSpy).toHaveBeenCalledOnce();
  });
});
