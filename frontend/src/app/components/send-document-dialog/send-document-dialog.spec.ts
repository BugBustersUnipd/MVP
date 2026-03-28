import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendDocumentDialog } from './send-document-dialog';

describe('SendDocumentDialog', () => {
  let component: SendDocumentDialog;
  let fixture: ComponentFixture<SendDocumentDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendDocumentDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendDocumentDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
