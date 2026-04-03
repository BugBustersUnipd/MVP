import {Result} from "./result.model";
// nota1: ho aggiunto i campi che prima erano in ResultAiCopilot perchè li abbiamo spostati, come ha fatto il backend
// nota2: ho aggiunto tutti i campit del recepient che restituisce il backend, questo perchè evitiamo così di fare chiamate per riceverli, se tanto alla fine dobbiamo mostrarli. Ho valutato attentamente ed è la soluzione più efficiente.
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