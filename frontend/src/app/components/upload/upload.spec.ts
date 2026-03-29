import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Upload } from './upload';
import { vi } from 'vitest';

describe('Upload', () => {
  let component: Upload;
  let fixture: ComponentFixture<Upload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Upload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Upload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.accept).toBe('.pdf,.csv,.jpg');
    expect(component.multiple).toBe(true);
    expect(component.titleText).toBe('Carica uno o più documenti');
  });

  it('should emit only valid files from onPrimeSelect', () => {
    const valid = new File(['x'], 'doc.pdf');
    const invalid = new File(['x'], 'img.png');
    const selectedSpy = vi.spyOn(component.filesSelected, 'emit');
    const invalidSpy = vi.spyOn(component.fileValidationError, 'emit');

    component.onPrimeSelect({ files: [valid, invalid] });

    expect(selectedSpy).toHaveBeenCalledWith([valid]);
    expect(invalidSpy).toHaveBeenCalledWith({ invalidFiles: ['img.png'] });
  });

  it('should accept all files when accept list is empty', () => {
    component.accept = '';
    const f1 = new File(['x'], 'a.any');
    const f2 = new File(['x'], 'b.other');
    const selectedSpy = vi.spyOn(component.filesSelected, 'emit');

    component.onPrimeSelect({ currentFiles: [f1, f2] });

    expect(selectedSpy).toHaveBeenCalledWith([f1, f2]);
  });

  it('should extract files from native event and reset input value', () => {
    const valid = new File(['x'], 'doc.csv');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [valid] });
    input.value = 'something';
    const selectedSpy = vi.spyOn(component.filesSelected, 'emit');

    component.onNativeSelect({ target: input } as unknown as Event);

    expect(selectedSpy).toHaveBeenCalledWith([valid]);
    expect(input.value).toBe('');
  });

  it('should return empty list when event has no files', () => {
    const selectedSpy = vi.spyOn(component.filesSelected, 'emit');
    component.onPrimeSelect({});
    expect(selectedSpy).toHaveBeenCalledWith([]);
  });

  it('should trigger click on native input when available', () => {
    const click = vi.fn();
    (component as any).nativeFileInput = { nativeElement: { click } };

    component.triggerClick();

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('should ignore triggerClick when native input is missing', () => {
    (component as any).nativeFileInput = undefined;
    expect(() => component.triggerClick()).not.toThrow();
  });
});