import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from "@angular/core";
import { FileUpload } from "primeng/fileupload";

export interface UploadValidationError {
  invalidFiles: string[];
}

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
    @Output() fileValidationError = new EventEmitter<UploadValidationError>();
    
    onPrimeSelect(event: any) {
    const files = this.extractFiles(event);
    this.emitValidatedFiles(files);
    }

    onNativeSelect(event: Event) {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      this.emitValidatedFiles(files);

      // Permette di riselezionare lo stesso file consecutivamente.
      input.value = '';
    }

    private emitValidatedFiles(files: File[]): void {
      const validFiles = files.filter((file) => this.isAllowedFile(file));
      const invalidFiles = files.filter((file) => !this.isAllowedFile(file));

      if (invalidFiles.length > 0) {
        this.fileValidationError.emit({
          invalidFiles: invalidFiles.map((file) => file.name),
        });
      }

      this.filesSelected.emit(validFiles);
    }

    private isAllowedFile(file: File): boolean {
      const fileName = file.name.toLowerCase();
      const extension = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
      const acceptedTypes = this.parseAcceptedTypes();

      if (acceptedTypes.size === 0) {
        return true;
      }

      return acceptedTypes.has(extension);
    }

    private parseAcceptedTypes(): Set<string> {
      return new Set(
        (this.accept || '')
          .split(',')
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => entry.startsWith('.')),
      );
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