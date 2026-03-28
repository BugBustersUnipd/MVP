import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tables } from './tables';

describe('Tables', () => {
  let component: Tables;
  let fixture: ComponentFixture<Tables>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tables]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tables);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
