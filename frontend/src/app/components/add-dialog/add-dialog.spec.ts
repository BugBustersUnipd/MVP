import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
