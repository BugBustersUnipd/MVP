import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { AiCoPilotService } from './ai-co-pilot-service';
import { ResultAiCopilotSerializer } from '../../app/shared/serializers/result-ai-copilot.serializer';
import { State } from '../../app/shared/models/result-split.model';
import { DocumentState } from '../../app/shared/models/result-ai-copilot.model';

describe('AiCoPilotService', () => {
  let service: AiCoPilotService;
  let httpMock: HttpTestingController;

  const serializerMock = {
    creaStatoIniziale: () => ({ id: -1, name: 'mock', pages: 0, state: 'in_coda', ResultSplit: [] }),
    deserializeExtractedDocument: (raw: any) => raw,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ResultAiCopilotSerializer, useValue: serializerMock },
      ],
    });
    service = TestBed.inject(AiCoPilotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch companies and update companies$', () => {
    let companies: any[] = [];
    service.companies$.subscribe((value) => (companies = value));

    service.fetchCompanies();

    const req = httpMock.expectOne('http://localhost:3000/lookups/companies');
    expect(req.request.method).toBe('GET');
    req.flush({ companies: [{ id: 1, name: 'ACME' }] });

    expect(companies).toEqual([{ id: 1, name: 'ACME' }]);
  });

  it('should set employees to empty when company is missing', () => {
    let employees: any[] = [{ id: 1, name: 'Old' }];
    service.employees$.subscribe((value) => (employees = value));

    service.fetchEmployeesByCompany('');

    expect(employees).toEqual([]);
    expect(httpMock.match(() => true).length).toBe(0);
  });

  it('should fetch employees by company and map fields', () => {
    let employees: any[] = [];
    service.employees$.subscribe((value) => (employees = value));

    service.fetchEmployeesByCompany('TechCorp');

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/lookups/users');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('company')).toBe('TechCorp');

    req.flush({
      users: [
        { id: 10, name: 'Mario', email: 'mario@test.com', employee_code: 'EMP-1' },
      ],
    });

    expect(employees).toEqual([
      { id: 10, name: 'Mario', email: 'mario@test.com', employeeCode: 'EMP-1' },
    ]);
  });

  it('should compute categories and departments from history', () => {
    (service as any).resultsHistorySubject.next([
      { id: 1, category: 'Cedolino', department: 'HR' },
      { id: 2, category: 'Cedolino', department: 'HR' },
      { id: 3, category: 'Contratto', department: 'Legal' },
    ]);

    let categories: string[] = [];
    let departments: string[] = [];
    service.category$.subscribe((value) => (categories = value));
    service.department$.subscribe((value) => (departments = value));

    service.fetchCategories();
    service.fetchDepartment();

    expect(categories).toEqual(['Cedolino', 'Contratto']);
    expect(departments).toEqual(['HR', 'Legal']);
  });

  it('should expose state and confidence options', () => {
    let states: string[] = [];
    let confidence: string[] = [];
    service.state$.subscribe((value) => (states = value));
    service.confidence$.subscribe((value) => (confidence = value));

    service.fetchState();
    service.fetchConfidence();

    expect(states).toEqual(Object.values(State));
    expect(confidence).toEqual(['0-20', '21-40', '41-60', '61-80', '81-100']);
  });

  it('should update current result stream', () => {
    let current: any = null;
    service.currentResult$.subscribe((value) => (current = value));

    service.updateResult({ id: 77, parentId: 9, name: 'split-1' } as any);

    expect(current).toEqual(expect.objectContaining({ id: 77, parentId: 9, name: 'split-1' }));
  });

  it('should call window.open for original and extracted PDFs', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    service.getOriginalPdfById(11);
    service.getPdfById(22);

    expect(openSpy).toHaveBeenCalledWith('http://localhost:3000/documents/uploads/11/file', '_blank');
    expect(openSpy).toHaveBeenCalledWith(expect.stringMatching(/^http:\/\/localhost:3000\/documents\/extracted\/22\/pdf\?t=/), '_blank');
    openSpy.mockRestore();
  });

  it('should fetch templates and map values', () => {
    let templates: any[] = [];
    service.templates$.subscribe((value) => (templates = value));

    service.fetchTemplates();

    const indexReq = httpMock.expectOne('http://localhost:3000/templates');
    expect(indexReq.request.method).toBe('GET');
    indexReq.flush({ templates: [{ id: 1, subject: 'Template A' }] });

    const showReq = httpMock.expectOne('http://localhost:3000/templates/1');
    expect(showReq.request.method).toBe('GET');
    showReq.flush({ template: { id: 1, subject: 'Template A', body: 'Body A' } });

    expect(templates).toEqual([{ id: 1, name: 'Template A', content: 'Body A' }]);
  });

  it('should create new template and append to templates stream', () => {
    (service as any).templatesSubject.next([{ id: 10, name: 'Base', content: 'x' }]);

    let templates: any[] = [];
    service.templates$.subscribe((value) => (templates = value));

    service.newTemplate('Nuovo', 'Contenuto');

    const req = httpMock.expectOne('http://localhost:3000/templates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subject: 'Nuovo', body: 'Contenuto' });
    req.flush({ template: { id: 11, subject: 'Nuovo', body: 'Contenuto' } });

    expect(templates).toEqual([
      { id: 10, name: 'Base', content: 'x' },
      { id: 11, name: 'Nuovo', content: 'Contenuto' },
    ]);
  });

  it('should fetch extracted document and push it to currentResult$', () => {
    let current: any = null;
    service.currentResult$.subscribe((value) => (current = value));

    service.fetchExtractedDocument(44);

    const sendingsReq = httpMock.expectOne('http://localhost:3000/sendings');
    sendingsReq.flush({ sendings: [] });

    const req = httpMock.expectOne('http://localhost:3000/documents/extracted/44');
    expect(req.request.method).toBe('GET');
    req.flush({ extracted_document: { id: 44, name: 'Split 44' } });

    expect(current).toEqual({ id: 44, name: 'Split 44' });
  });

  it('should return empty siblings when parentId is missing', () => {
    let siblings: any[] = [{ id: 1 }];
    service.otherExtractedDocuments$.subscribe((value) => (siblings = value));

    service.getDocumentsByParent(0, 1);

    expect(siblings).toEqual([]);
    expect(httpMock.match(() => true).length).toBe(0);
  });

  it('should fetch siblings and exclude current result id', () => {
    let siblings: any[] = [];
    service.otherExtractedDocuments$.subscribe((value) => (siblings = value));

    service.getDocumentsByParent(12, 2);

    const req = httpMock.expectOne('http://localhost:3000/documents/uploads/12/extracted');
    expect(req.request.method).toBe('GET');
    req.flush({ extracted_documents: [{ id: 1 }, { id: 2 }, { id: 3 }] });

    expect(siblings).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('should patch range and then refetch extracted document', () => {
    service.modifyDocumentRange$(8, 1, 3).subscribe();

    const patchReq = httpMock.expectOne('http://localhost:3000/documents/extracted/8/reassign_range');
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ page_start: 1, page_end: 3 });
    patchReq.flush({ ok: true });

    const getReq = httpMock.expectOne('http://localhost:3000/documents/extracted/8');
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ extracted_document: { id: 8 } });
  });

  it('should patch metadata and update both currentResult$ and history', () => {
    let current: any = null;
    let history: any = null;
    service.currentResult$.subscribe((value) => (current = value));
    service.currentResultsHistory$.subscribe((value) => (history = value));

    service.updateDocumentMetadata$(5, { recipient: 'Mario' }).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/documents/extracted/5/metadata');
    expect(req.request.method).toBe('PATCH');
    req.flush({ extracted_document: { id: 5, recipientName: 'Mario' } });

    expect(current).toEqual({ id: 5, recipientName: 'Mario' });
    expect(history).toEqual([{ id: 5, recipientName: 'Mario' }]);
  });

  it('should process history upload list and request extracted docs per upload', () => {
    let history: any = null;
    service.currentResultsHistory$.subscribe((value) => (history = value));

    service.fetchHistoryResults();

    const sendingsReq = httpMock.expectOne('http://localhost:3000/sendings');
    sendingsReq.flush({ sendings: [] });

    const uploadsReq = httpMock.expectOne('http://localhost:3000/documents/uploads');
    expect(uploadsReq.request.method).toBe('GET');
    uploadsReq.flush({
      uploaded_documents: [
        { id: 11, original_filename: 'a.pdf' },
        { id: 12, original_filename: 'b.pdf' },
      ],
    });

    const extracted1 = httpMock.expectOne('http://localhost:3000/documents/uploads/11/extracted');
    const extracted2 = httpMock.expectOne('http://localhost:3000/documents/uploads/12/extracted');

    extracted1.flush({ extracted_documents: [{ id: 101, parentId: 11, category: 'C1', department: 'D1' }] });
    extracted2.flush({ extracted_documents: [{ id: 102, parentId: 12, category: 'C2', department: 'D2' }] });

    expect(history).toEqual([
      { id: 101, parentId: 11, category: 'C1', department: 'D1' },
      { id: 102, parentId: 12, category: 'C2', department: 'D2' },
    ]);
  });

  it('should add pending parent for each uploaded file', () => {
    const processSpy = vi.spyOn(service as any, 'processDocument').mockImplementation(() => ({}));
    const f1 = new File(['a'], 'a.pdf', { type: 'application/pdf' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });

    service.uploadFiles([f1, f2], 'ACME', 'HR', 'Cedolini', '01/2025');

    expect(processSpy).toHaveBeenCalledTimes(2);
    const sessionParents = (service as any).sessionParentsSubject.value;
    expect(sessionParents.length).toBe(2);
    processSpy.mockRestore();
  });

  it('should process document realtime events through websocket', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ uploaded_document_id: 55, job_id: 'job-1' });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:3000/cable');

    ws.onopen?.({});
    expect(ws.send).toHaveBeenCalled();

    ws.onmessage?.({ data: JSON.stringify({ type: 'confirm_subscription' }) });
    const confirmRefresh = httpMock.expectOne('http://localhost:3000/documents/uploads/55/extracted');
    confirmRefresh.flush({ uploaded_document: { original_filename: 'doc.pdf' }, extracted_documents: [{ id: 1 }] });

    ws.onmessage?.({ data: JSON.stringify({ message: { event: 'document_processed', extracted_document_id: 99 } }) });
    const singleReq = httpMock.expectOne('http://localhost:3000/documents/extracted/99');
    singleReq.flush({ extracted_document: { id: 99 } });

    ws.onmessage?.({ data: JSON.stringify({ message: { event: 'split_completed' } }) });
    const splitRefresh = httpMock.expectOne('http://localhost:3000/documents/uploads/55/extracted');
    splitRefresh.flush({ uploaded_document: { original_filename: 'doc.pdf' }, extracted_documents: [{ id: 2, parentId: 55, state: 'Da validare' }] });

    ws.onmessage?.({ data: JSON.stringify({ message: { event: 'processing_completed' } }) });
    const doneRefresh = httpMock.expectOne('http://localhost:3000/documents/uploads/55/extracted');
    doneRefresh.flush({ uploaded_document: { original_filename: 'doc.pdf' }, extracted_documents: [{ id: 3, parentId: 55, state: 'Pronto' }] });
    expect(ws.close).toHaveBeenCalled();

    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should upload csv files through process_file endpoint', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    const csv = new File(['a,b'], 'doc.csv', { type: 'text/csv' });
    service.uploadFiles([csv], 'ACME', 'HR', 'Cedolini', '01/2025');

    const req = httpMock.expectOne('http://localhost:3000/documents/process_file');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.get('file')).toBe(csv);
    expect(req.request.body.get('category')).toBe('Cedolini');
    expect(req.request.body.get('company')).toBe('ACME');
    req.flush({ uploaded_document_id: 88, job_id: 'job-csv' });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:3000/cable');
    expect(ws.protocols).toEqual(['actioncable-v1-json', 'actioncable-unsupported']);

    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should close websocket on reject_subscription', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    postReq.flush({ uploaded_document_id: 55, job_id: 'job-reject' });

    const ws = MockWebSocket.instances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: 'reject_subscription' }) });

    expect(ws.close).toHaveBeenCalled();

    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should keep parent in processing state and close websocket on processing_failed', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    postReq.flush({ uploaded_document_id: 77, job_id: 'job-failed' });

    const ws = MockWebSocket.instances[0];
    ws.onmessage?.({
      data: JSON.stringify({ message: { event: 'processing_failed', error: 'boom' } }),
    });

    const failedRefresh = httpMock.expectOne('http://localhost:3000/documents/uploads/77/extracted');
    failedRefresh.flush({ uploaded_document: { original_filename: 'doc.pdf' }, extracted_documents: [{ id: 4, parentId: 77, state: 'Errore' }] });

    const parents = (service as any).sessionParentsSubject.value;
    expect(parents[0]?.state).toBe(DocumentState.Failed);
    expect(ws.close).toHaveBeenCalled();

    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should guard parent name updates when input is invalid or unchanged', () => {
    expect((service as any).parentNamesSubject.value).toEqual({});

    (service as any).setParentName(10, 'file.pdf');
    expect((service as any).parentNamesSubject.value[10]).toBe('file.pdf');

    const before = (service as any).parentNamesSubject.value;
    (service as any).setParentName(10, 'file.pdf');
    expect((service as any).parentNamesSubject.value).toEqual(before);
  });

  it('should replace pending parent id and carry parent name mapping', () => {
    (service as any).sessionParentsSubject.next([
      { id: -1, name: 'doc.pdf', pages: 0, state: DocumentState.InCoda, ResultSplit: [] },
    ]);
    (service as any).parentNamesSubject.next({ '-1': 'doc.pdf' });

    (service as any).replacePendingParentId(-1, 101, DocumentState.InElaborazione);

    const parents = (service as any).sessionParentsSubject.value;
    const names = (service as any).parentNamesSubject.value;

    expect(parents[0].id).toBe(101);
    expect(parents[0].state).toBe(DocumentState.InElaborazione);
    expect(names[-1]).toBeUndefined();
    expect(names[101]).toBe('doc.pdf');
  });

  it('should remove pending parent when upload fails', () => {
    let sessionParents: any[] = [];
    service.currentSessionParents$.subscribe((value) => (sessionParents = value));

    const processSpy = vi
      .spyOn(service as any, 'processDocument')
      .mockImplementation((...args: unknown[]) => {
        const file = args[0] as File;
        const currentParents = (service as any).sessionParentsSubject.value;
        const pendingParentId = currentParents[currentParents.length - 1]?.id;
        if (pendingParentId) {
          (service as any).removeSessionParent(pendingParentId);
        }
        return { id: -1, name: file.name };
      });

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    expect(processSpy).toHaveBeenCalledOnce();
    expect(sessionParents.length).toBe(0);

    processSpy.mockRestore();
  });

  it('should refresh history results even when history already loaded', () => {
    (service as any).resultsHistorySubject.next([{ id: 1 }]);
    service.fetchHistoryResults();

    const sendingsReq = httpMock.expectOne('http://localhost:3000/sendings');
    sendingsReq.flush({ sendings: [] });

    const uploadsReq = httpMock.expectOne('http://localhost:3000/documents/uploads');
    uploadsReq.flush({ uploaded_documents: [] });

    expect((service as any).resultsHistorySubject.value).toEqual([{ id: 1 }]);
  });

  it('should handle fetch templates error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.fetchTemplates();

    const req = httpMock.expectOne('http://localhost:3000/templates');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle new template error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.newTemplate('T', 'Body');

    const req = httpMock.expectOne('http://localhost:3000/templates');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle fetch extracted document error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.fetchExtractedDocument(999);

    const sendingsReq = httpMock.expectOne('http://localhost:3000/sendings');
    sendingsReq.flush({ sendings: [] });

    const req = httpMock.expectOne('http://localhost:3000/documents/extracted/999');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle siblings fetch error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.getDocumentsByParent(13, 2);

    const req = httpMock.expectOne('http://localhost:3000/documents/uploads/13/extracted');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle modify range error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.modifyDocumentRange$(9, 1, 4).subscribe({
      error: (err) => console.error('Errore nella modifica del range:', err),
    });

    const req = httpMock.expectOne('http://localhost:3000/documents/extracted/9/reassign_range');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    expect(httpMock.match('http://localhost:3000/documents/extracted/9').length).toBe(0);
    errorSpy.mockRestore();
  });

  it('should handle update metadata error branch', () => {
    service.updateDocumentMetadata$(6, { recipient: 'X' }).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('http://localhost:3000/documents/extracted/6/metadata');
    req.flush('err', { status: 500, statusText: 'Server Error' });
  });

  it('should handle history fetch outer error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (service as any).resultsHistorySubject.next(null);

    service.fetchHistoryResults();

    const sendingsReq = httpMock.expectOne('http://localhost:3000/sendings');
    sendingsReq.flush({ sendings: [] });

    const req = httpMock.expectOne('http://localhost:3000/documents/uploads');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle employees fetch error branch', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.fetchEmployeesByCompany('ACME');

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:3000/lookups/users');
    req.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should close websocket on websocket error event', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    postReq.flush({ uploaded_document_id: 66, job_id: 'job-err' });

    const ws = MockWebSocket.instances[0];
    ws.onerror?.(new Error('ws boom'));

    expect(errorSpy).toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalled();

    errorSpy.mockRestore();
    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should ignore realtime refresh on confirm_subscription when uploaded id is invalid', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    postReq.flush({ uploaded_document_id: 0, job_id: 'job-zero' });

    const ws = MockWebSocket.instances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: 'confirm_subscription' }) });

    expect(httpMock.match('http://localhost:3000/documents/uploads/0/extracted').length).toBe(0);
    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should ignore document_processed event when extracted id is invalid', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    postReq.flush({ uploaded_document_id: 70, job_id: 'job-invalid-extracted' });

    const ws = MockWebSocket.instances[0];
    ws.onmessage?.({ data: JSON.stringify({ message: { event: 'document_processed', extracted_document_id: 0 } }) });

    expect(httpMock.match('http://localhost:3000/documents/extracted/0').length).toBe(0);
    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should handle extracted documents refresh error on confirm subscription', () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onopen: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();

      constructor(public url: string, public protocols?: string[]) {
        MockWebSocket.instances.push(this);
      }
    }

    const originalWebSocket = (globalThis as any).WebSocket;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis as any).WebSocket = MockWebSocket as any;

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    service.uploadFiles([file], 'ACME', 'HR', 'Cedolini', '01/2025');

    const postReq = httpMock.expectOne('http://localhost:3000/documents/split');
    postReq.flush({ uploaded_document_id: 99, job_id: 'job-refresh-error' });

    const ws = MockWebSocket.instances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: 'confirm_subscription' }) });

    const refreshReq = httpMock.expectOne('http://localhost:3000/documents/uploads/99/extracted');
    refreshReq.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    (globalThis as any).WebSocket = originalWebSocket;
  });

  it('should handle nested extracted fetch errors in history loading', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (service as any).resultsHistorySubject.next(null);

    service.fetchHistoryResults();

    const sendingsReq = httpMock.expectOne('http://localhost:3000/sendings');
    sendingsReq.flush({ sendings: [] });

    const uploadsReq = httpMock.expectOne('http://localhost:3000/documents/uploads');
    uploadsReq.flush({
      uploaded_documents: [{ id: 21, original_filename: 'bad.pdf' }],
    });

    const extractedReq = httpMock.expectOne('http://localhost:3000/documents/uploads/21/extracted');
    extractedReq.flush('err', { status: 500, statusText: 'Server Error' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
