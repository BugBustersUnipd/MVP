import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
