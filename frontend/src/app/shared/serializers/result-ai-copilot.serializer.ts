import { Injectable } from '@angular/core';
import { ResultSplit, State} from '../models/result-split.model';
@Injectable({
  providedIn: 'root'
})
export class ResultAiCopilotSerializer{
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

  /**
   * Normalizza la confidence in percentuale.
   * @param confidence Valore confidence in ingresso.
   * @returns Confidence in percentuale (0-100+).
   */
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

  /**
   * Normalizza le confidence per campo in forma percentuale.
   * @param confidence Oggetto confidence per campo.
   * @returns Mappa campo -> percentuale confidence.
   */
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
 
  /**
   * Converte un valore in File con fallback.
   * @param value Valore da convertire.
   * @param fallback File fallback se non valido.
   * @returns File valido.
   */
  asFile(value: unknown, fallback: File = new File([], '')): File {
    return value instanceof File ? value : fallback;
  }
 
  /**
   * Converte un valore in stringa con fallback.
   * @param value Valore da convertire.
   * @param fallback Valore di fallback.
   * @returns Stringa normalizzata.
   */
  asString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
  }
 
  /**
   * Mappa lo status backend nello stato documento usato in frontend.
   * @param status Stato ricevuto dal backend.
   * @returns Stato frontend equivalente.
   */
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
 