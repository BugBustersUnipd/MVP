import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { SelectComponent } from './menutendina';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
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
