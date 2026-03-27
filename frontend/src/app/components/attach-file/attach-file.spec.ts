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
});
