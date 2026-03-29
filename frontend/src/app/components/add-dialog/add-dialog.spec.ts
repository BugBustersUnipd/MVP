import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AddDialog } from './add-dialog';

describe('AddDialog', () => {
  let component: AddDialog;
  let fixture: ComponentFixture<AddDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(AddDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose title and label by type', () => {
    component.type = 'tone';
    expect(component.dialogTitle).toBe('Aggiungi un tono');
    expect(component.saveLabel).toBe('Salva tono');

    component.type = 'style';
    expect(component.dialogTitle).toBe('Aggiungi uno stile');
    expect(component.saveLabel).toBe('Salva stile');

    component.type = 'template';
    expect(component.dialogTitle).toBe('Aggiungi un template');
    expect(component.saveLabel).toBe('Salva template');
  });

  it('should close dialog and reset form state', () => {
    const visibleSpy = vi.spyOn(component.visibleChange, 'emit');
    component.visible = true;
    component.name = 'Nome';
    component.description = 'Descrizione';
    component.submitted = true;

    component.close();

    expect(component.visible).toBe(false);
    expect(visibleSpy).toHaveBeenCalledWith(false);
    expect(component.name).toBe('');
    expect(component.description).toBe('');
    expect(component.submitted).toBe(false);
  });

  it('should not emit save when name is empty after trim', () => {
    const saveSpy = vi.spyOn(component.saveRequested, 'emit');
    const closeSpy = vi.spyOn(component, 'close');
    component.name = '   ';
    component.description = 'x';

    component.save();

    expect(component.submitted).toBe(true);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should emit normalized payload and close on valid save', () => {
    const saveSpy = vi.spyOn(component.saveRequested, 'emit');
    const closeSpy = vi.spyOn(component, 'close');
    component.type = 'style';
    component.name = '  Nome stile  ';
    component.description = '   ';

    component.save();

    expect(saveSpy).toHaveBeenCalledWith({
      type: 'style',
      name: 'Nome stile',
      description: 'Nome stile',
    });
    expect(closeSpy).toHaveBeenCalled();
  });

});
