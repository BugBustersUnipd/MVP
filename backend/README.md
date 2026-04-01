# MVP — Backend

API Rails per una piattaforma di **elaborazione documenti** e **generazione contenuti AI** multi-azienda.

---

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Runtime | Ruby 3.3.10 / Rails 8.1.2 |
| Database | PostgreSQL 16 |
| Queue / Cache / Cable | Solid Queue · Solid Cache · Solid Cable (database-backed) |
| OCR | AWS Textract |
| LLM / Immagini | AWS Bedrock (Nova · Nova Canvas) |
| Storage file | Filesystem locale (Active Storage) |
| WebSocket | Action Cable |
| Container | Docker Compose |
| Deploy | Kamal |
| Test | Minitest · Mocha · SimpleCov |

---

## Prerequisiti

- Docker e Docker Compose
- Credenziali AWS con accesso a Textract e Bedrock

---

## Setup rapido

```bash
# 1. Clona il repository e spostati nella root del progetto
cd MVP

# 2. Crea il file delle variabili d'ambiente
cp backend/.env.example backend/.env
# Compila AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN

# 3. Avvia tutti i servizi
docker compose up
```

Il backend è raggiungibile su `http://localhost:3000`.

---

## Variabili d'ambiente

Tutte le variabili vanno nel file `backend/.env`.

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Sì | Credenziale AWS |
| `AWS_SECRET_ACCESS_KEY` | Sì | Credenziale AWS |
| `AWS_SESSION_TOKEN` | Se MFA | Token di sessione temporaneo AWS |
| `AWS_REGION` | No (default `us-east-1`) | Region AWS per Bedrock e Textract |

Le credenziali del database sono gestite direttamente da `docker-compose.yml`.

> Le credenziali AWS Bedrock sono temporanee (session token). Quando scadono l'API risponde con un errore esplicito che indica di aggiornare le variabili e riavviare il container.

---

## Comandi utili

```bash
# Eseguire i test
docker compose run --rm backend bin/rails test

# Console Rails
docker compose run --rm backend bin/rails console

# Migrazioni
docker compose run --rm backend bin/rails db:migrate

# Seed
docker compose run --rm backend bin/rails db:seed

#Setup completo db
docker compose run --rm backend bin/rails db:setup
```

---

## Architettura

### Dominio

```
Company
├── Employee          (utente appartenente all'azienda)
├── Tone              (tono da usare nella generazione AI)
├── Style             (stile da usare nella generazione AI)
├── UploadedDocument  (documento PDF/CSV/immagine caricato)
│   ├── ProcessingRun     (run di elaborazione, tiene il job_id)
│   │   └── ProcessingItem    (elemento singolo del run)
│   └── ExtractedDocument (documento estratto, con metadati jsonb)
│       └── Sending       (invio email collegato al documento)
└── GeneratedDatum    (contenuto generato dall'AI)
    └── Post          (post pubblicabile creato dalla generazione)

Template             (modello di invio email)
User                 (utente di sistema)
```

### Flusso elaborazione documenti

```
POST /documents/split (o /process_file)
  → PdfSplitJob / GenericFileProcessingJob    [queue: split / data]
    → DataExtractionJob (uno per pagina/elemento)  [queue: data]
      → AWS Textract (OCR)
      → AWS Bedrock (estrazione metadati strutturati)
      → ActionCable broadcast su "document_processing:{job_id}"
```

### Flusso generazione AI

```
POST /generated_data
  → AiGeneratorJob                            [queue: default]
    → AWS Bedrock Nova (generazione testo)
    → AWS Bedrock Nova Canvas (generazione immagine)
    → ActionCable broadcast su "generation_channel"
```

### Aggiornamenti in tempo reale (WebSocket)

| Canale | Topic | Quando |
|---|---|---|
| `DocumentProcessingChannel` | `document_processing:{job_id}` | Ogni passo dell'elaborazione |
| `GenerationChannel` | `generation_channel` | Start, completamento, errore della generazione AI |

Il `job_id` viene restituito nella response HTTP dell'endpoint che avvia il job: il client lo usa per sottoscriversi al canale corretto.

---

## API Reference

### Documenti

| Metodo | Path | Descrizione |
|---|---|---|
| `POST` | `/documents/split` | Carica e accoda lo split di un PDF |
| `POST` | `/documents/process_file` | Carica e processa un file non-PDF (CSV, immagine) |
| `GET` | `/documents/uploads` | Lista degli uploaded document |
| `GET` | `/documents/uploads/:id/file` | Scarica il file originale |
| `GET` | `/documents/uploads/:id/extracted` | Lista dei documenti estratti da un upload |
| `POST` | `/documents/uploads/:id/retry` | Riaccodare il processing (qualsiasi stato) |
| `DELETE` | `/documents/uploads/:id` | Elimina upload e tutti i documenti estratti |
| `GET` | `/documents/extracted/:id` | Dettaglio documento estratto |
| `GET` | `/documents/extracted/:id/pdf` | Scarica il PDF del range di pagine estratto |
| `PATCH` | `/documents/extracted/:id/metadata` | Aggiorna i metadati estratti |
| `PATCH` | `/documents/extracted/:id/reassign_range` | Riassegna il range di pagine e rielabora |
| `PATCH` | `/documents/extracted/:id/validate` | Valida il documento (stato `done` → `validated`) |
| `POST` | `/documents/extracted/:id/retry` | Riaccodare la data extraction (qualsiasi stato) |

Il retry risponde con `{ status: "queued", job_id: "..." }`. Gli aggiornamenti successivi arrivano su Action Cable.

### Modulo AI generativo

| Metodo | Path | Descrizione |
|---|---|---|
| `POST` | `/generated_data` | Avvia una generazione AI |
| `GET` | `/generated_data/:id` | Recupera il risultato (solo se `completed`) |
| `POST` | `/generated_data/:id/regenerate` | Rigenera dal record padre |
| `PATCH` | `/generated_data/:id/rating` | Salva il rating (1–5) |
| `DELETE` | `/generated_data/:id` | Elimina la generazione |
| `GET` | `/tones` | Lista toni per azienda (`?company_id=`) |
| `POST` | `/tones` | Crea un tono |
| `DELETE` | `/tones/:id` | Disattiva un tono (soft delete) |
| `GET` | `/styles` | Lista stili per azienda (`?company_id=`) |
| `POST` | `/styles` | Crea uno stile |
| `DELETE` | `/styles/:id` | Disattiva uno stile (soft delete) |
| `GET` | `/posts` | Lista post (ordinati per data desc) |
| `POST` | `/posts` | Crea un post da una generazione |
| `DELETE` | `/posts/:id` | Elimina un post |

### Invii e template

| Metodo | Path | Descrizione |
|---|---|---|
| `GET` | `/sendings` | Lista invii |
| `POST` | `/sendings` | Crea un invio |
| `GET` | `/templates` | Lista template |
| `GET` | `/templates/:id` | Dettaglio template |
| `POST` | `/templates` | Crea un template |

### Analytics

| Metodo | Path | Descrizione |
|---|---|---|
| `GET` | `/ai_generator_data_analyst` | Statistiche modulo generatore AI |
| `GET` | `/ai_copilot_data_analyst` | Statistiche modulo AI copilot |

### Lookup

| Metodo | Path | Descrizione |
|---|---|---|
| `GET` | `/lookups/companies` | Lista aziende |
| `GET` | `/lookups/users` | Lista utenti |

### Health check

| Metodo | Path |
|---|---|
| `GET` | `/up` |

---

## Test

```bash
# Suite completa
docker compose run --rm backend bin/rails test

# File singolo
docker compose run --rm backend bin/rails test test/controllers/documents_controller_test.rb
```

Copertura attuale: **~90% linee · ~73% branch** (669 test).

---

## Struttura directory

```
app/
├── channels/           # Action Cable (DocumentProcessing, Generation)
├── controllers/        # Controller REST
├── jobs/               # Background jobs (AI, PDF split, estrazione)
├── models/             # ActiveRecord models
├── serializers/        # Serializzatori JSON
└── services/
    ├── ai_generator/   # Pipeline generazione testo+immagine (Bedrock)
    ├── ai_analyst/     # Analisi statistiche delle generazioni
    └── document_processing/  # Pipeline OCR + estrazione dati
config/
├── routes.rb
└── ...
test/
├── controllers/        # Test di integrazione per controller
├── integration/        # Test di flusso end-to-end
├── jobs/
└── services/
```
