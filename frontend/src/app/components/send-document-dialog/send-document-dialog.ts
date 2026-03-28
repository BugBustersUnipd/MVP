import {Component, inject, Input, ViewChild} from '@angular/core';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {DynamicDialogConfig} from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { AsyncPipe } from '@angular/common';

import { Button} from '../button/button';  
import { Menutendina } from '../menutendina/menutendina';
import { Prompt } from '../prompt/prompt';
import { Observable } from 'rxjs';
import { AddDialog,AddDialogType } from '../add-dialog/add-dialog';
import { AttachFile } from "../attach-file/attach-file";

// Interface per i dati da inviare
export interface SendDocumentData {
    messaggio: string;
    orarioInvio: {  name: string; value: string};
    fileAttachments: File[];
    template?: string;
}
@Component({
    selector: 'app-send-document-dialog',
    templateUrl: './send-document-dialog.html',
    styleUrl: './send-document-dialog.css',
    providers: [],
    imports: [TableModule, Button, Menutendina, Prompt, AsyncPipe, AddDialog, AttachFile]
})
export class SendDocumentDialog {
    public ref: DynamicDialogRef= inject(DynamicDialogRef);
    public config: DynamicDialogConfig= inject(DynamicDialogConfig);

    @ViewChild('attachFile') attachFileComponent!: AttachFile;

    addDialogVisible: boolean = false;
    addDialogType: AddDialogType = 'tone';
    
    @Input() options: any[] = [];
    templates$: Observable<any[]> | undefined;
    selectedTemplate: any = null;
    private _messaggio: string = '';
    
    get messaggio(): string {
        return this._messaggio || this.selectedTemplate?.content || '';
    }
    
    set messaggio(value: string) {
        this._messaggio = value;
    }
    
    timeOptions: any[] = [
        { name: 'Adesso', value: 'now' },
        { name: 'Domani alle 9:00', value: 'tomorrow_9am' },
        { name: 'Dopodomani alle 9:00', value: 'day_after_9am' },
        { name: 'Lunedì alle 9:00', value: 'monday_9am' },
    ];
    selectedTime: { name: string; value: string } = this.timeOptions[0];
    ngOnInit() {
        if (this.config.data && this.config.data.templates$) {
            this.templates$ = this.config.data.templates$;
        }
    }

    openAddDialog(type: AddDialogType): void {
        this.addDialogType = type;
        this.addDialogVisible = true;
    }

    closeDialog() {
        this.ref.close();
    }
      
    confirmDialog(){        
        const sendData: SendDocumentData = {
            messaggio: this.messaggio,
            orarioInvio: this.selectedTime ? this.selectedTime : this.timeOptions[0],
            fileAttachments: this.attachFileComponent.files,
            template: this.selectedTemplate?.name
        };
        this.ref.close(sendData);
    }
}