import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { vi } from 'vitest';

import { ImageTitle } from './image-title';

describe('ImageTitle', () => {
  let component: ImageTitle;
  let fixture: ComponentFixture<ImageTitle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageTitle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageTitle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync title when imageTitle input changes', () => {
    component.imageTitle = 'Titolo iniziale';

    component.ngOnChanges({
      imageTitle: new SimpleChange('', 'Titolo iniziale', false),
    });

    expect(component.title).toBe('Titolo iniziale');
  });

  it('should emit selected image file', () => {
    const emitSpy = vi.spyOn(component.imageChange, 'emit');
    const file = new File(['x'], 'img.png', { type: 'image/png' });

    component.onImageChange({ files: [file] });

    expect(emitSpy).toHaveBeenCalledWith(file);
  });

  it('should update and emit title on change', () => {
    const emitSpy = vi.spyOn(component.imageTitleChange, 'emit');

    component.onTitleChange('Nuovo titolo');

    expect(component.title).toBe('Nuovo titolo');
    expect(emitSpy).toHaveBeenCalledWith('Nuovo titolo');
  });

  it('should normalize undefined title to empty string', () => {
    const emitSpy = vi.spyOn(component.imageTitleChange, 'emit');

    component.onTitleChange(undefined as unknown as string);

    expect(component.title).toBe('');
    expect(emitSpy).toHaveBeenCalledWith('');
  });
});
