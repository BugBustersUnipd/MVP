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

  it('should emit remove request', () => {
    const emitSpy = vi.spyOn(component.remove, 'emit');

    component.emitRemove(5);

    expect(emitSpy).toHaveBeenCalledWith(5);
  });

  it('should emit add new request', () => {
    const emitSpy = vi.spyOn(component.addNew, 'emit');

    component.emitAddNew();

    expect(emitSpy).toHaveBeenCalledOnce();
  });
});
