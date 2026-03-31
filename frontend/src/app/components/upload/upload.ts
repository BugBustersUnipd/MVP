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
  private selectedPrimeFiles: File[] = [];

    @Input() accept: string = '.pdf,.csv,.jpg';
    @Input() maxFileSize: number = 10000000; // In byte (es. 10MB)
    @Input() multiple: boolean = true;
    @Input() titleText: string = 'Carica uno o più documenti';
    @Input() subtitleText: string = '(pdf, csv, jpg)';

    @Output() filesSelected = new EventEmitter<File[]>();
    @Output() fileValidationError = new EventEmitter<UploadValidationError>();
    
    onPrimeSelect(event: any) {
      const files = this.extractCurrentFiles(event) || this.extractFiles(event);
      const validFiles = this.emitValidatedFiles(files);
      this.selectedPrimeFiles = [...validFiles];
    }

    onPrimeRemove(event: any) {
      const currentFiles = this.extractCurrentFiles(event) || this.extractFiles(event);

      if (currentFiles.length > 0) {
        this.selectedPrimeFiles = [...currentFiles];
        this.filesSelected.emit(currentFiles);
        return;
      }

      if (event?.file) {
        this.selectedPrimeFiles = this.removeSingleFile(this.selectedPrimeFiles, event.file as File);
        this.filesSelected.emit(this.selectedPrimeFiles);
        return;
      }

      this.selectedPrimeFiles = [];
      this.filesSelected.emit([]);
    }

    onPrimeClear() {
      this.selectedPrimeFiles = [];
      this.filesSelected.emit([]);
    }

    onNativeSelect(event: Event) {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      this.emitValidatedFiles(files);

      // Permette di riselezionare lo stesso file consecutivamente.
      input.value = '';
    }

    private emitValidatedFiles(files: File[]): File[] {
      const validFiles = files.filter((file) => this.isAllowedFile(file));
      const invalidFiles = files.filter((file) => !this.isAllowedFile(file));

      if (invalidFiles.length > 0) {
        this.fileValidationError.emit({
          invalidFiles: invalidFiles.map((file) => file.name),
        });
      }

      this.filesSelected.emit(validFiles);
      return validFiles;
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

    private extractCurrentFiles(event: any): File[] | null {
      if (Array.isArray(event?.currentFiles)) {
        return event.currentFiles;
      }

      return null;
    }

    private removeSingleFile(files: File[], toRemove: File): File[] {
      const index = files.findIndex(
        (file) =>
          file.name === toRemove.name &&
          file.size === toRemove.size &&
          file.lastModified === toRemove.lastModified
      );

      if (index < 0) {
        return files;
      }

      return [...files.slice(0, index), ...files.slice(index + 1)];
    }

}