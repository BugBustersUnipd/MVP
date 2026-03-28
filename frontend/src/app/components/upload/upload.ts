import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from "@angular/core";
import { FileUpload } from "primeng/fileupload";

@Component({
  selector: 'app-upload',
  templateUrl: './upload.html',
  styleUrls: ['./upload.css'],
  imports: [FileUpload]
})
export class Upload {
    @ViewChild('nativeFileInput') nativeFileInput!: ElementRef<HTMLInputElement>;

    @Input() accept: string = '.pdf,.csv,.jpg';
    @Input() maxFileSize: number = 10000000; // In byte (es. 10MB)
    @Input() multiple: boolean = true;
    @Input() titleText: string = 'Carica uno o più documenti';
    @Input() subtitleText: string = '(pdf, csv, jpg)';

    @Output() filesSelected = new EventEmitter<File[]>();
    
    onPrimeSelect(event: any) {
    const files = this.extractFiles(event);
    this.filesSelected.emit(files);
    }

    onNativeSelect(event: Event) {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      this.filesSelected.emit(files);

      // Permette di riselezionare lo stesso file consecutivamente.
      input.value = '';
    }

    triggerClick() {
      if (this.nativeFileInput?.nativeElement) {
        this.nativeFileInput.nativeElement.click();
      }
    }

    private extractFiles(event: any): File[] {
      if (Array.isArray(event?.files)) {
        return event.files;
      }

      if (Array.isArray(event?.currentFiles)) {
        return event.currentFiles;
      }

      const nativeFiles = event?.originalEvent?.target?.files;
      if (nativeFiles) {
        return Array.from(nativeFiles);
      }

      return [];
    }

}