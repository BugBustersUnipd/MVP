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

  it('should normalize page start and align page end when needed', () => {
    component.page_end = 2;

    component.onPageStartChange('4');

    expect(component.page_start).toBe(4);
    expect(component.page_end).toBe(4);
  });

  it('should set page end to page start when end is lower than start', () => {
    component.page_start = 5;

    component.onPageEndChange(2);

    expect(component.page_end).toBe(5);
  });

  it('should accept undefined and valid end values', () => {
    component.page_start = 3;

    component.onPageEndChange('');
    expect(component.page_end).toBeUndefined();

    component.onPageEndChange('8');
    expect(component.page_end).toBe(8);
  });

  it('should compute pageEndMin from page_start and page_min', () => {
    component.page_min = 2;
    component.page_start = undefined;
    expect(component.pageEndMin).toBe(2);

    component.page_start = 5;
    expect(component.pageEndMin).toBe(5);
  });
});
