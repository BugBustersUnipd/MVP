import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Button } from '../button/button';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
@Component({
  selector: 'app-dialog',
  imports: [Button, FormsModule, ConfirmDialogModule, ToastModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
})
export class Dialog {
@Input() Icon : string = 'pi pi-times';
@Input() icon: string = 'pi pi-info-circle';
@Input() message: string = 'Vuoi cancellare questo elemento?';
@Input() header: string = 'Attenzione';
@Input() acceptLabel: string = 'Conferma';
@Input() rejectLabel: string = 'Annulla';
@Input() successMessage: string = 'Operazione completata';
@Input() cancelMessage: string = 'Operazione annullata';
@Output() confirmed = new EventEmitter<void>();
private confirmationService = inject(ConfirmationService);
private messageService = inject(MessageService);

    onConfirm(event: Event) {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: this.message,
            header: this.header,
            icon: this.icon,
            rejectLabel: this.rejectLabel,
            rejectButtonProps: {
                label: this.rejectLabel,
                severity: 'secondary',
                outlined: true
            },
            acceptButtonProps: {
                label: this.acceptLabel,
                severity: 'danger'
            },
        
            accept: () => {
                this.confirmed.emit();
                this.messageService.add({ severity: 'success', summary: 'Confermato', detail: this.successMessage });
            },
            reject: () => {
                this.messageService.add({ severity: 'error', summary: 'Annullato', detail: this.cancelMessage });
            }
        });
    }
}
