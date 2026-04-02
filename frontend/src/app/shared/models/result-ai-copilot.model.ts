import { ResultSplit, RecipientInfo } from "./result-split.model";
import { Result } from "./result.model";
import { Observable } from "rxjs";

export interface TemplateOption {
    id: number;
    name: string;
    content: string;
}
export interface SendDocumentData {
    messaggio: string;
    orarioInvio: {  name: string; value: string};
    fileAttachments: File[];
    templateId?: number;
    templateName?: string;
}
export interface CreateSendingPayload {
    extracted_document_id: number;
    recipient_id: number;
    sent_at: string;
    subject?: string;
    body?: string;
    template_id?: number;
}

export interface EmployeeMenuOption {
  id: number;
  name: string;
  recipient: RecipientInfo;
}

export interface SelectEmployeeDialogData {
  extractedEmployeeName: string;
  employees$: Observable<RecipientInfo[]>;
}

export interface ResultAiCopilot extends Result {
    name: string;
    ResultSplit: ResultSplit[]; 
    pages: number;
    state: DocumentState;
}
// DA CAPIRE PERCHE NON CE UN API CHE TORNA LO STATO DEL DOCUMENTO NELLA SUA INTEREZZA
export enum DocumentState {
    Completato = 'Completato',
    InElaborazione = 'In elaborazione',
    InCoda = 'In coda',     
    Failed = 'Failed',
}


