import { ResultAiCopilotSerializer } from './result-ai-copilot.serializer';
import { State } from '../models/result-split.model';

describe('ResultAiCopilotSerializer', () => {
  let serializer: ResultAiCopilotSerializer;

  beforeEach(() => {
    serializer = new ResultAiCopilotSerializer();
  });

  it('should create initial state from file', () => {
    const result = serializer.creaStatoIniziale(
      new File(['x'], 'cedolino.pdf', { type: 'application/pdf' }),
    );

    expect(result.id).toBe(0);
    expect(result.name).toBe('cedolino.pdf');
    expect(result.ResultSplit).toEqual([]);
  });

  it('should serialize from payload file', () => {
    const result = serializer.serialize([new File(['x'], 'file.csv')]);
    expect(result.name).toBe('file.csv');
    expect(result.id).toBe(0);
  });

  it('should throw on deserialize not implemented', () => {
    expect(() => serializer.deserialize({} as any)).toThrow();
  });

  it('should deserialize extracted document with numeric confidence <= 1', () => {
    const split = serializer.deserializeExtractedDocument({
      id: 5,
      status: 'done',
      confidence: 0.84,
      matched_employee: { id: 11, name: 'Mario', email: 'mario@test.com', employee_code: 'EMP-1' },
      process_time_seconds: 7,
      page_start: 1,
      page_end: 2,
      metadata: { company: 'ACME', department: 'HR', category: 'Cedolini', month_year: '01/2025' },
      created_at: '2025-01-05T00:00:00.000Z',
      uploaded_document_id: 91,
    });

    expect(split.state).toBe(State.Pronto);
    expect(split.confidence).toBe(84);
    expect(split.recipient.recipientName).toBe('Mario');
    expect(split.company).toBe('ACME');
    expect(split.parentId).toBe(91);
  });

  it('should deserialize extracted document with string confidence and fallback name', () => {
    const split = serializer.deserializeExtractedDocument({
      id: 8,
      status: 'sent',
      confidence: '72',
      recipient: '',
      metadata: { type: 'F24', competence: '02/2025' },
      created_at: '2025-01-06T00:00:00.000Z',
      uploaded_document_id: 50,
    });

    expect(split.state).toBe(State.Inviato);
    expect(split.confidence).toBe(72);
    expect(split.name).toBe('Documento 8');
    expect(split.category).toBe('F24');
    expect(split.month_year).toBe('02/2025');
  });

  it('should average object confidence and map queued status', () => {
    const split = serializer.deserializeExtractedDocument({
      id: 9,
      status: 'queued',
      confidence: { a: 0.6, b: 0.9 },
      recipient: 'Luca',
      metadata: { date: '03/2025' },
      created_at: '2025-01-07T00:00:00.000Z',
      uploaded_document_id: 60,
    });

    expect(split.state).toBe(State.InElaborazione);
    expect(split.confidence).toBe(75);
    expect(split.name).toBe('Luca');
    expect(split.month_year).toBe('03/2025');
  });

  it('should include zero confidence fields in object average', () => {
    const split = serializer.deserializeExtractedDocument({
      id: 11,
      status: 'done',
      confidence: { competence: 1.0, department: 0.0 },
      metadata: { competence: '02/2025' },
      created_at: '2025-01-08T00:00:00.000Z',
      uploaded_document_id: 70,
    });

    expect(split.confidence).toBe(50);
  });

  it('should preserve confidence decimals without integer rounding', () => {
    const split = serializer.deserializeExtractedDocument({
      id: 12,
      status: 'done',
      confidence: { company: 0.996, department: 0.0 },
      metadata: {},
      created_at: '2025-01-08T00:00:00.000Z',
      uploaded_document_id: 71,
    });

    expect(split.confidence).toBe(49.8);
    expect(split.fieldConfidences['company']).toBe(99.6);
  });

  it('should fallback confidence to zero on invalid payload', () => {
    const split = serializer.deserializeExtractedDocument({
      id: 10,
      status: 'in_progress',
      confidence: { a: 'x', b: null },
      metadata: {},
      created_at: '2025-01-07T00:00:00.000Z',
      uploaded_document_id: 60,
    });

    expect(split.confidence).toBe(0);
    expect(split.state).toBe(State.InElaborazione);
  });
});
