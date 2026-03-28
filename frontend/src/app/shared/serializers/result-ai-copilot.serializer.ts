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
    const metadata = raw.metadata ?? {};
    const category = metadata['category'] ?? metadata['type'] ?? '';
    const competence = metadata['month_year'] ?? metadata['competence'] ?? metadata['date'] ?? '';
    const recipientName = raw.matched_employee?.name ?? raw.recipient ?? '';

    return {
      id: raw.id,
      name: recipientName || `Documento ${raw.id}`,
      state: this.mapStatus(raw.status),
      confidence: this.normalizeConfidence(raw.confidence),
      recipientId: raw.matched_employee?.id ?? 0,
      recipientName: recipientName,
      recipientEmail: raw.matched_employee?.email ?? '',
      recipientCode: raw.matched_employee?.employee_code ?? '',
      time_Analysis: raw.process_time_seconds ?? 0,
      page_start: raw.page_start,
      page_end: raw.page_end,
      company: metadata['company'] ?? '',
      department: metadata['department'] ?? '',
      month_year: competence,
      category: category,
      data: new Date(raw.created_at),
      parentId: raw.uploaded_document_id,
    };
  }

  private normalizeConfidence(confidence: unknown): number {
    if (typeof confidence === 'number' && Number.isFinite(confidence)) {
      return confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    }

    if (typeof confidence === 'string') {
      const parsed = Number(confidence);
      if (Number.isFinite(parsed)) {
        return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
      }
      return 0;
    }

    if (confidence && typeof confidence === 'object') {
      const values = Object.values(confidence as Record<string, unknown>)
        .map((v) => (typeof v === 'number' ? v : Number(v)))
        .filter((v) => Number.isFinite(v));

      if (values.length === 0) return 0;

      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      return avg <= 1 ? Math.round(avg * 100) : Math.round(avg);
    }

    return 0;
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
      case 'done':       return State.Pronto;
      case 'validated':  return State.Pronto;
      case 'sent':       return State.Inviato;
      case 'scheduled':  return State.Programmato;
      case 'queued':
      case 'in_progress':
      default:           return State.DaValidare;
    }
  }
}
 