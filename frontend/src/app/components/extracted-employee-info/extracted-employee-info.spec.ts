import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ExtractedEmployeeInfo } from './extracted-employee-info';

describe('ExtractedEmployeeInfo', () => {
  let component: ExtractedEmployeeInfo;
  let fixture: ComponentFixture<ExtractedEmployeeInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtractedEmployeeInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtractedEmployeeInfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit edit request', () => {
    const emitSpy = vi.spyOn(component.editRequested, 'emit');

    component.requestEdit();

    expect(emitSpy).toHaveBeenCalledOnce();
  });

  it('should emit row removal index', () => {
    const emitSpy = vi.spyOn(component.rowRemoved, 'emit');

    component.requestRowRemoval(3);

    expect(emitSpy).toHaveBeenCalledWith(3);
  });
});
