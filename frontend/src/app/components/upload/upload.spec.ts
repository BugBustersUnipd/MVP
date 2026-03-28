import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Upload } from './upload';
import { FileUploadModule } from 'primeng/fileupload';

describe('Upload', () => {
  let component: Upload;
  let fixture: ComponentFixture<Upload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Upload ],
      imports: [ FileUploadModule ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Upload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.accept).toBe('.pdf,.csv,.jpg');
    expect(component.multiple).toBe(true);
    expect(component.titleText).toBe('Carica uno o più documenti');
  });
});