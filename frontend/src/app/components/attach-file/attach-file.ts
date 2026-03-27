import { Component } from '@angular/core';
import { FileUpload } from 'primeng/fileupload';
import { Button } from '../button/button';
@Component({
  selector: 'app-attach-file',
  imports: [FileUpload, Button],
  templateUrl: './attach-file.html',
  styleUrl: './attach-file.css',
})
export class AttachFile {
  files: File[] = [];

  onSelect(event: any) {
    // aggiunge file selezionati
    this.files = [...this.files, ...event.files];
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
  }
}
