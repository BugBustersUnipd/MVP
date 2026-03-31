import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { vi } from 'vitest';

import { Editor } from './editor';

describe('Editor', () => {
  let component: Editor;
  let fixture: ComponentFixture<Editor>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Editor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync editor text on text input change', () => {
    component.text = 'Contenuto iniziale';

    component.ngOnChanges({
      text: new SimpleChange('', 'Contenuto iniziale', false),
    });

    expect(component.editorText).toBe('Contenuto iniziale');
  });

  it('should emit textChange on model change', () => {
    const emitSpy = vi.spyOn(component.textChange, 'emit');

    component.onTextModelChange('Nuovo contenuto');

    expect(component.editorText).toBe('Nuovo contenuto');
    expect(emitSpy).toHaveBeenCalledWith('Nuovo contenuto');
  });

  it('should normalize undefined model value to empty string', () => {
    const emitSpy = vi.spyOn(component.textChange, 'emit');

    component.onTextModelChange(undefined as unknown as string);

    expect(component.editorText).toBe('');
    expect(emitSpy).toHaveBeenCalledWith('');
  });
});
