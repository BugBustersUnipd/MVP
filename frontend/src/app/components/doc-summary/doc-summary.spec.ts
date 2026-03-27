import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocSummary } from './doc-summary';

describe('DocSummary', () => {
  let component: DocSummary;
  let fixture: ComponentFixture<DocSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
