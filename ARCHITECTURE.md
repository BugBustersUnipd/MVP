# Architettura del Progetto MVP

## Indice
1. [Stack Tecnologico](#stack-tecnologico)
2. [Architettura di Deploy](#architettura-di-deploy)
3. [Architettura a Strati](#architettura-a-strati)
4. [Struttura del Modulo DocumentProcessing](#struttura-del-modulo-documentprocessing)
5. [Design Patterns](#design-patterns)
6. [Database Schema](#database-schema)
7. [Background Jobs](#background-jobs)
8. [API Design](#api-design)
9. [Strategia di Testing](#strategia-di-testing)
10. [Dipendenze Chiave](#dipendenze-chiave)

---

## Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Framework | Ruby on Rails 8.1 (API mode) |
| Database | PostgreSQL |
| Web Server | Puma |
| Reverse Proxy | Thruster (HTTP/2) |
| Job Queue | Solid Queue (database-backed) |
| Cache | Solid Cache (database-backed) |
| WebSocket | Solid Cable + Action Cable |
| Deploy | Kamal (container orchestration) |
| Containerizzazione | Docker (multi-stage build) |
| OCR | AWS Textract |
| LLM | AWS Bedrock (Claude) |
| Testing | Minitest + SimpleCov |

---

## Architettura di Deploy

### Topologia

```
[Browser / Client]
        │
      HTTP/2
        │
  [Thruster proxy]          ← reverse proxy, porta 80
        │
  [Puma (Rails API)]        ← application server
        │
  [PostgreSQL]
     │       │
     │   [Solid Queue]      ← job workers (in-process o dedicati)
     │   [Solid Cable]      ← WebSocket broker
     └   [Solid Cache]      ← cache layer
```

### Docker

- **`Dockerfile`** — immagine di sviluppo, single-stage
- **`Dockerfile_production`** — multi-stage build:
  - Stage `base`: Ruby 3.3 + dipendenze sistema
  - Stage `build`: installazione gem, precompilazione bootsnap
  - Stage `final`: immagine minimale con jemalloc, utente non-root (uid 1000)

```dockerfile
# Ottimizzazione memoria in produzione
ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so
```

### Kamal

Il deployment usa **Kamal**, orchestratore container-based nativo di Rails 8. La configurazione in `config/deploy.yml` definisce:
- Registry Docker locale (`localhost:5555`)
- Volume persistente per storage (`backend_storage:/rails/storage`)
- Possibilità di separare il processo job su server dedicato

```yaml
# config/deploy.yml
env:
  SOLID_QUEUE_IN_PUMA: true   # job supervisor dentro il processo web
```

---

## Architettura a Strati

Il progetto adotta una **architettura layered con elementi hexagonali**. Il modulo `DocumentProcessing` costituisce il nucleo del dominio ed è completamente isolato dal framework Rails — le dipendenze esterne vengono iniettate tramite un container.

```
┌──────────────────────────────────────────────┐
│  HTTP Layer                                  │
│  Controllers (documents, lookups, sendings)  │
├──────────────────────────────────────────────┤
│  Commands                                    │
│  Punto di ingresso del dominio               │
│  (InitializeProcessing, ReassignRange, ...)  │
├──────────────────────────────────────────────┤
│  Service Layer / Orchestrators               │
│  ProcessDataItem, ProcessSplitRun,           │
│  ProcessGenericFile                          │
│                                              │
│  Domain Services                             │
│  DataExtractor, RecipientResolver,           │
│  ConfidenceCalculator, LlmService, Ocr       │
├──────────────────────────────────────────────┤
│  Persistence Layer                           │
│  DataItemRepository, SplitRunRepository,     │
│  DbManager, FileStorage                      │
├──────────────────────────────────────────────┤
│  Data Layer                                  │
│  ActiveRecord Models (14 modelli)            │
├──────────────────────────────────────────────┤
│  External Adapters                           │
│  AWS Textract (OCR), AWS Bedrock (LLM)       │
└──────────────────────────────────────────────┘
```

---

## Struttura del Modulo DocumentProcessing

```
app/document_processing/
├── commands/
│   ├── initialize_processing.rb       # Upload PDF
│   ├── initialize_file_processing.rb  # Upload CSV/immagine
│   └── reassign_extracted_range.rb    # Riassegna pagine
├── persistence/
│   ├── data_item_repository.rb        # Lifecycle ProcessingItem
│   ├── split_run_repository.rb        # Lifecycle ProcessingRun
│   ├── db_manager.rb                  # Query alto livello
│   └── file_storage.rb               # Astrazione filesystem
├── presenters/
│   └── extracted_document_presenter.rb
├── lookups/
│   ├── companies_fetcher.rb
│   └── users_fetcher.rb
├── sendings/
│   └── create_sending.rb
├── container.rb                       # DI container (30+ dipendenze)
├── process_data_item.rb               # Orchestratore principale
├── process_split_run.rb               # Orchestratore PDF splitting
├── process_generic_file.rb            # Orchestratore CSV/immagine
├── data_extractor.rb                  # Estrazione dati via LLM
├── llm_service.rb                     # Client AWS Bedrock
├── ocr.rb                             # Client AWS Textract
├── recipient_resolver.rb              # Fuzzy matching engine
├── confidence_calculator.rb
├── extracted_metadata_builder.rb
├── pdf_splitter.rb
├── csv_processor.rb
├── image_processor.rb
├── page_range_pdf.rb
├── upload_manager.rb
└── action_cable_notifier.rb
```

---

## Design Patterns

### 1. Dependency Injection — Container

`DocumentProcessing::Container` è un DI container con 30+ dipendenze lazy-loaded.

```ruby
def ocr_service
  @ocr_service ||= @ocr_service_class.new(textract_client: textract_client)
end
```

I controller e i job ricevono il container iniettato. Nei test viene usato un `FakeContainer` che sostituisce i client AWS, rendendo la suite completamente indipendente da infrastrutture esterne.

---

### 2. Command Pattern

`DocumentProcessing::Commands::` — oggetti con singolo metodo `#call` che incapsulano operazioni con side-effect e restituiscono un hash standardizzato:

```ruby
result = initialize_processing_command.call(file:, category:, ...)
# => { ok: true, job_id: "...", uploaded_document_id: 123 }
# => { ok: false, error: :duplicate, message: "..." }
```

**Comandi disponibili:**
- `InitializeProcessing` — valida il file, calcola checksum, crea `UploadedDocument`, accoda `PdfSplitJob`
- `InitializeFileProcessing` — gestisce upload CSV/immagine
- `ReassignExtractedRange` — riassegna l'intervallo di pagine di un documento estratto

---

### 3. Repository Pattern

I repository astraggono le query SQL e le transizioni di stato, isolando il dominio da ActiveRecord.

```ruby
# Esempio DataItemRepository
repository.mark_item_in_progress!(processing_item_id)
repository.mark_item_done!(processing_item_id, metadata:, confidence:)
```

**Repository:**
- `DataItemRepository` — gestisce `ProcessingItem` ed `ExtractedDocument`
- `SplitRunRepository` — gestisce `ProcessingRun` e gli artefatti di splitting
- `DbManager` — operazioni di alto livello (lista upload, aggiornamento metadata)

---

### 4. Service Object / Orchestrator

Oggetti con `#call` che orchestrano pipeline multi-step:

| Orchestratore | Pipeline |
|---|---|
| `ProcessDataItem` | OCR → LLM extraction → Confidence → Fuzzy matching → WebSocket broadcast |
| `ProcessSplitRun` | Split PDF → Crea record → Accoda job per ogni pagina |
| `ProcessGenericFile` | Routing per tipo → CsvProcessor o ImageProcessor |

---

### 5. Strategy Pattern

Selezione dinamica del processore in base al tipo di file:

```
file_kind = "pdf"   → PdfSplitter
file_kind = "csv"   → CsvProcessor
file_kind = "image" → ImageProcessor
```

Il Container espone le strategie come dipendenze intercambiabili, facilitando l'aggiunta di nuovi formati.

---

### 6. Factory Pattern

Il Container fornisce factory method per oggetti parametrici:

```ruby
container.pdf_splitter(pdf: pdf_object)
container.confidence_calculator(ocr_lines:, recipient_names:, metadata:)
container.extracted_metadata_builder(metadata:, uploaded_document:)
```

---

### 7. Presenter / Decorator

`ExtractedDocumentPresenter` trasforma il modello ActiveRecord in JSON per l'API, separando la logica di presentazione dal modello:

- Aggiunge URL di download calcolati (`pdf_download_url`)
- Formatta i dati annidati (`matched_employee`)
- Normalizza i campi per il frontend

---

### 8. State Machine

`ExtractedDocument` ha stati espliciti con transizioni gestite dai repository con `with_lock` per sicurezza concorrente:

```
queued → in_progress → done → validated → sent
                    └→ failed
```

Analogamente `ProcessingRun`:
```
queued → splitting → processing → completed
                              └→ failed
```

---

### 9. Observer (ActionCableNotifier)

`ActionCableNotifier` agisce da observer: i servizi lo notificano al completamento di ogni fase, lui trasmette eventi WebSocket al client per aggiornamenti in tempo reale:

- `split_completed` — splitting PDF terminato
- `document_processed` — singolo documento estratto
- `processing_completed` — batch completo

---

## Database Schema

**13 tabelle PostgreSQL:**

| Tabella | Scopo | Relazioni principali |
|---|---|---|
| `uploaded_documents` | File sorgente (PDF/CSV/immagine) | has_many extracted_documents |
| `extracted_documents` | Documenti singoli dopo lo splitting | belongs_to uploaded_document, employee |
| `processing_runs` | Tracciamento esecuzione batch | has_many processing_items |
| `processing_items` | Singolo documento in un batch | belongs_to processing_run, extracted_document |
| `users` | Persone (dipendenti) | has_many employees |
| `employees` | Associazione User–Company | belongs_to company, user |
| `companies` | Organizzazioni | has_many employees, styles, tones |
| `sendings` | Record di invio documenti | belongs_to extracted_document, user, template |
| `templates` | Template email/messaggi | has_many sendings |
| `generated_data` | Contenuto generato da AI | belongs_to company, style, tone |
| `posts` | Post social media | belongs_to generated_datum |
| `styles` | Stili per generazione contenuti | belongs_to company |
| `tones` | Toni per generazione contenuti | belongs_to company |

**Vincoli notevoli:**
- `uploaded_documents.checksum` — UNIQUE (deduplicazione file)
- `processing_runs.job_id` — UNIQUE (un job per run)
- Indici su campi di stato (`queued`, `done`, `failed`) per query efficienti

---

## Background Jobs

**Framework:** Solid Queue (Rails 8, database-backed, senza Redis)

| Job | Coda | Responsabilità |
|---|---|---|
| `PdfSplitJob` | `:split` | Esegue splitting PDF, accoda DataExtractionJob per ogni pagina |
| `DataExtractionJob` | `:data` | OCR + estrazione LLM + fuzzy matching per un singolo documento |
| `GenericFileProcessingJob` | `:data` | Elaborazione CSV o immagine |

```yaml
# config/queue.yml
queues:
  - split   # single-threaded (splitting sequenziale)
  - data    # concorrente (estrazione parallela)
```

---

## API Design

**Modalità:** Rails API (no views, middleware minimale)

```
POST   /documents/split                    Avvia splitting di un PDF
POST   /documents/process_file             Processa CSV o immagine
GET    /documents/uploads                  Lista file caricati
GET    /documents/uploads/:id/extracted    Lista documenti estratti
GET    /documents/extracted/:id            Dettaglio documento estratto
GET    /documents/extracted/:id/pdf        Download PDF estratto
PATCH  /documents/extracted/:id/metadata  Aggiorna metadata
PATCH  /documents/extracted/:id/validate  Segna come validato
POST   /documents/uploads/:id/retry        Riprova processing
POST   /documents/extracted/:id/retry      Riprova estrazione dati

GET    /lookups/companies                  Autocomplete aziende
GET    /lookups/users                      Autocomplete utenti

GET    /sendings                           Lista invii
POST   /sendings                           Crea invio

GET    /templates                          Lista template
POST   /templates                          Crea template
GET    /templates/:id                      Dettaglio template
```

**Formato risposta:**
```json
{
  "status": "ok | error | queued",
  "message": "...",
  "job_id": "uuid",
  "extracted_document": { ... }
}
```

---

## Strategia di Testing

**Framework:** Minitest + SimpleCov (coverage)

```
test/
├── controllers/     ← Integration test HTTP (ActionDispatch)
├── integration/     ← Flussi end-to-end
├── jobs/            ← Test accodamento e esecuzione job
├── models/          ← Validazioni e state machine
└── services/        ← Unit test service objects e command
```

**FakeContainer Pattern**

Il pattern centrale per il testing: `FakeContainer` sostituisce tutti i client AWS con double, permettendo test completi senza infrastruttura esterna.

```ruby
def fake_container(overrides = {})
  # Usa repo e resolver reali, stub per OCR e LLM
  DocumentProcessing::Container.new(
    ocr_service_class: FakeOcr,
    llm_service_class: FakeLlm,
    **overrides
  )
end
```

---

## Dipendenze Chiave

```ruby
# Core
rails ~> 8.1.2          # Framework
pg                       # PostgreSQL adapter

# Solid Stack (Rails 8)
solid_queue              # Job queue database-backed
solid_cache              # Cache database-backed
solid_cable              # WebSocket database-backed

# AWS
aws-sdk-textract         # OCR
aws-sdk-bedrockruntime   # LLM (Claude via Bedrock)

# Document Processing
combine_pdf              # Manipolazione PDF
csv                      # Parsing CSV
image_processing         # Varianti immagini

# Server & Deploy
puma                     # Application server
thruster                 # Reverse proxy HTTP/2
kamal                    # Deploy orchestration

# Security & Quality
brakeman                 # Security static analysis
bundler-audit            # Vulnerability audit dipendenze
rubocop-rails-omakase    # Style enforcement

# Testing
simplecov                # Code coverage
```

---

## File Chiave

| File | Ruolo |
|---|---|
| `app/document_processing/container.rb` | DI container, 30+ dipendenze |
| `app/document_processing/process_data_item.rb` | Orchestratore pipeline principale |
| `app/document_processing/recipient_resolver.rb` | Fuzzy matching (Jaro-Winkler, Dice) |
| `app/document_processing/llm_service.rb` | Integrazione AWS Bedrock |
| `app/controllers/documents_controller.rb` | Entry point HTTP principale |
| `config/deploy.yml` | Configurazione Kamal |
| `db/schema.rb` | Schema database completo |
