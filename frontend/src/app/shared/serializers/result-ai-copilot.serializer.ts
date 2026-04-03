import { Injectable } from '@angular/core';
import { ResultAiCopilot, DocumentState } from '../models/result-ai-copilot.model';
import { ResultSplit, State} from '../models/result-split.model';
@Injectable({
  providedIn: 'root'
})
export class ResultAiCopilotSerializer{
  creaStatoIniziale(file: File): ResultAiCopilot {
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
    const category = metadata['type'] ?? '';
    const competence =  metadata['competence'] ?? metadata['month_year'] ?? '';
    const reason = metadata['reason'] ?? '';
    const recipientName = raw.matched_employee?.name ?? raw.recipient ?? '';
    const recipient = {
      recipientId: raw.matched_employee?.id ?? 0,
      recipientName: recipientName,
      rawRecipientName: raw.recipient ?? '',
      recipientEmail: raw.matched_employee?.email ?? '',
      recipientCode: raw.matched_employee?.employee_code ?? '',
    };
    return {
      id: raw.id,
      state: this.mapStatus(raw.status),
      confidence: this.normalizeConfidence(raw.confidence),
      fieldConfidences: this.normalizeFieldConfidences(raw.confidence),
      recipient,
      time_Analysis: raw.process_time_seconds ?? 0,
      page_start: raw.page_start,
      page_end: raw.page_end,
      company: metadata['company'] ?? '',
      department: metadata['department'] ?? '',
      reason: reason,
      month_year: competence,
      category: category,
      data: new Date(raw.created_at),
      data_interna: metadata['data_interna'] ?? metadata['date'] ?? metadata['data'] ?? '',
      parentId: raw.uploaded_document_id,
    };
  }

  private normalizeConfidence(confidence: unknown): number {
    if (typeof confidence === 'number' && Number.isFinite(confidence)) {
      return confidence <= 1 ? confidence * 100 : confidence;
    }

    if (typeof confidence === 'string') {
      const parsed = Number(confidence);
      if (Number.isFinite(parsed)) {
        return parsed <= 1 ? parsed * 100 : parsed;
      }
      return 0;
    }

    if (confidence && typeof confidence === 'object') {
      const values = Object.values(confidence as Record<string, unknown>)
        .map((v) => (typeof v === 'number' ? v : Number(v)))
        .filter((v) => Number.isFinite(v) && v >= 0);

      if (values.length === 0) return 0;

      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      return avg <= 1 ? avg * 100 : avg;
    }

    return 0;
  }

  private normalizeFieldConfidences(confidence: unknown): Record<string, number> {
    if (!confidence || typeof confidence !== 'object') return {};
    return Object.fromEntries(
      Object.entries(confidence as Record<string, unknown>).map(([k, v]) => {
        const num = typeof v === 'number' ? v : Number(v);
        const pct = Number.isFinite(num) ? (num <= 1 ? num * 100 : num) : 0;
        return [k, pct];
      })
    );
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
      case 'done':        return State.Pronto;
      case 'validated':   return State.Pronto;
      case 'sent':        return State.Inviato;
      case 'scheduled':   return State.Programmato;
      case 'failed':      return State.Failed;
      case 'queued':
      case 'in_progress': return State.InElaborazione;
      default:            return State.DaValidare;
    }
  }
}
 