import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachFile } from './attach-file';

describe('AttachFile', () => {
  let component: AttachFile;
  let fixture: ComponentFixture<AttachFile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttachFile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttachFile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should append selected files', () => {
    const first = new File(['a'], 'a.pdf', { type: 'application/pdf' });
    const second = new File(['b'], 'b.pdf', { type: 'application/pdf' });
    component.files = [first];

    component.onSelect({ files: [second] });

    expect(component.files).toEqual([first, second]);
  });

  it('should remove file by index', () => {
    const first = new File(['a'], 'a.pdf', { type: 'application/pdf' });
    const second = new File(['b'], 'b.pdf', { type: 'application/pdf' });
    component.files = [first, second];

    component.removeFile(0);

    expect(component.files).toEqual([second]);
  });
});
