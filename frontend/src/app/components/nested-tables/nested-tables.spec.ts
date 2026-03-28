import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NestedTables } from './nested-tables';

describe('NestedTables', () => {
  let component: NestedTables;
  let fixture: ComponentFixture<NestedTables>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NestedTables]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NestedTables);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
