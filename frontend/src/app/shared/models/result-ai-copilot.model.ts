import { ResultSplit } from "./result-split.model";
import { Result } from "./result.model";

export interface ResultAiCopilot extends Result {
    name: string;
    ResultSplit: ResultSplit[]; 
    pages: number;

}


