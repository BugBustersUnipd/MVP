import {Result} from "./result.model";
export interface RecipientInfo {
    recipientId: number;
    recipientName: string;
    rawRecipientName: string;
    recipientEmail: string;
    recipientCode: string;
}

export interface ExtractedEmployeeInfoRow {
    recipient: RecipientInfo;
    rawName: string;
    hasMatch: boolean;
    recipientConfidence: number | null;
}

export interface OtherExtractDocumentRow {
    id: number | null;
    recipientName: string;
    confidence: number;
}

export interface ResultSplit extends Result {
    state: State;
    confidence: number;
    fieldConfidences: Record<string, number>;
    recipient: RecipientInfo;
    time_Analysis: number;
    page_end: number;
    page_start: number;
    company: string;
    department: string;
    reason: string;
    month_year: string; // o forse number
    category: string;  // sicuramente altro tipo
    data: Date;
    data_interna: Date;
    parentId: number;
}

export enum State {
    Pronto = 'Pronto',
    InElaborazione = 'In elaborazione',
    DaValidare = 'Da validare',
    Inviato = 'Inviato',
    Programmato = 'Programmato',
    Failed = 'Failed'
}