import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageRangeInput } from './page-range-input';

describe('PageRangeInput', () => {
  let component: PageRangeInput;
  let fixture: ComponentFixture<PageRangeInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageRangeInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageRangeInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
