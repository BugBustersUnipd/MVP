import { ResultSplit } from "./result-split.model";
import { Result } from "./result.model";

export interface TemplateOption {
    id: number;
    name: string;
    content: string;
}

export interface CreateSendingPayload {
    extracted_document_id: number;
    recipient_id: number;
    sent_at: string;
    subject?: string;
    body?: string;
    template_id?: number;
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


