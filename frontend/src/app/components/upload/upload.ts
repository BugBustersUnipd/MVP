import { Component, ViewChild, Input, Output, EventEmitter } from "@angular/core";
import { FileUpload } from "primeng/fileupload";

@Component({
  selector: 'app-upload',
  templateUrl: './upload.html',
  styleUrls: ['./upload.css'],
  imports: [FileUpload]
})
export class Upload {
    @ViewChild('fileUpload') fileUpload!: FileUpload;

    @Input() accept: string = '.pdf,.csv,.jpg';
    @Input() maxFileSize: number = 1000000; // In byte (es. 1MB)
    @Input() multiple: boolean = true;
    @Input() titleText: string = 'Carica uno o più documenti';
    @Input() subtitleText: string = '(pdf, csv, jpg)';

    @Output() filesSelected = new EventEmitter<File[]>();
    
    onSelectFiles(event: any) {
    this.filesSelected.emit(event.files);
    }

    triggerClick() {
    // Cerca l'input file nativo dentro il componente PrimeNG e lo clicca
      if (this.fileUpload) {
      const fileInput = this.fileUpload.el.nativeElement.querySelector('input[type="file"]');
        if (fileInput) {
        fileInput.click();
        }
      }
    }

}