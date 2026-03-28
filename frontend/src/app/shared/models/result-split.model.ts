import {Result} from "./result.model";
// nota1: ho aggiunto i campi che prima erano in ResultAiCopilot perchè li abbiamo spostati, come ha fatto il backend
// nota2: ho aggiunto tutti i campit del recepient che restituisce il backend, questo perchè evitiamo così di fare chiamate per riceverli, se tanto alla fine dobbiamo mostrarli. Ho valutato attentamente ed è la soluzione più efficiente.
export interface ResultSplit extends Result {
    name: string;
    state: State;
    confidence: number;
    recipientId: number;
    recipientName: string;
    recipientEmail: string;
    recipientCode: string;
    time_Analysis: number;
    page_end: number;
    page_start: number;
    company: string;
    department: string;
    month_year: string; // o forse number
    category: string;  // sicuramente altro tipo
    data: Date;
    parentId: number;
}

export enum State {
    Pronto = 'Pronto',
    DaValidare = 'Da validare',
    Inviato = 'Inviato',
    Programmato = 'Programmato'
}
