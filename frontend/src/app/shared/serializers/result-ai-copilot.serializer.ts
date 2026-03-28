import { Injectable } from '@angular/core';
import { ResultAiCopilot, DocumentState } from '../models/result-ai-copilot.model';
import { ResultSerializer } from './result.serializer';
import { ResultSplit, State} from '../models/result-split.model';
@Injectable({
  providedIn: 'root'
})
export class ResultAiCopilotSerializer extends ResultSerializer<ResultAiCopilot> {
    creaStatoIniziale(file: File, company: string, department: string, category: string, competence_period: string): ResultAiCopilot {
    return {
      id: 0, // non ancora assegnato dal backend
      name: file.name,
      pages: 0,
      state: DocumentState.InCoda,
      ResultSplit: [],
    } as ResultAiCopilot;
  }
    serialize(payload: unknown[]): ResultAiCopilot {
    return {
      id: 0,
      name: this.asFile(payload[0]).name,
      pages: 0,
      state: DocumentState.InCoda,
      ResultSplit: [],
    } as ResultAiCopilot;
  }
  deserialize(result: ResultAiCopilot): unknown[] {
    throw new Error('ResultAiCopilotSerializer.deserialize not implemented yet');
  }

   deserializeExtractedDocument(raw: any): ResultSplit {
    return {
      id: raw.id,
      name: raw.matched_employee?.name ?? `Documento ${raw.id}`,
      state: this.mapStatus(raw.status),
      confidence: raw.confidence ?? 0,
      recipientId: raw.matched_employee?.id ?? 0,
      recipientName: raw.matched_employee?.name ?? '',
      recipientEmail: raw.matched_employee?.email ?? '',
      recipientCode: raw.matched_employee?.employee_code ?? '',
      time_Analysis: raw.process_time_seconds ?? 0,
      page_start: raw.page_start,
      page_end: raw.page_end,
      company: raw.metadata?.['company'] ?? '',
      department: raw.metadata?.['department'] ?? '',
      month_year: raw.metadata?.['month_year'] ?? '',
      category: raw.metadata?.['category'] ?? '',
      data: new Date(raw.created_at),
      parentId: raw.uploaded_document_id,
    };
  }

// ─── helpers ──────────────────────────────────────────────────────────────
 
  asFile(value: unknown, fallback: File = new File([], '')): File {
    return value instanceof File ? value : fallback;
  }
 
  asString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
  }
 
  private mapStatus(status: string): State {
    switch (status) {
      case 'validated':  return State.Pronto;
      case 'sent':       return State.Inviato;
      case 'scheduled':  return State.Programmato;
      default:           return State.DaValidare;
    }
  }
}
 