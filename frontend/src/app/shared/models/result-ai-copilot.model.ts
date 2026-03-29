import { ResultSplit } from "./result-split.model";
import { Result } from "./result.model";

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


