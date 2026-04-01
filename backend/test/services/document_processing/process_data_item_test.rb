require "test_helper"

class ProcessDataItemTest < ActiveSupport::TestCase
  class FakeRepository
    attr_reader :calls

    # Inizializza le dipendenze del componente.
    def initialize(run:, item:, extracted_document:)
      @run = run
      @item = item
      @extracted_document = extracted_document
      @calls = []
    end

    # Recupera i dati necessari per l'operazione.
    def find_run_by_job_id(_job_id)
      @run
    end

    # Recupera i dati necessari per l'operazione.
    def find_processing_item(_id)
      @item
    end

    # Recupera i dati necessari per l'operazione.
    def find_extracted_document(_id)
      @extracted_document
    end

    # Verifica le condizioni richieste prima di procedere.
    def terminal_item?(_item)
      false
    end

    # Memorizza la transizione dell'item a in_progress.
    def mark_item_in_progress!(_item)
      @calls << :item_in_progress
    end

    # Memorizza la transizione del documento estratto a in_progress.
    def mark_extracted_document_in_progress!(_doc)
      @calls << :doc_in_progress
    end

    # Memorizza il completamento dell'item.
    def mark_item_done!(item:, resolution:)
      @calls << :item_done
    end

    # Memorizza il completamento del documento estratto.
    def mark_extracted_document_done!(**kwargs)
      @calls << :doc_done
    end

    # Gestione errore del flusso.
    def mark_item_failed(item:, error_message:)
      @calls << :item_failed
    end

    # Gestione errore del flusso.
    def mark_extracted_document_failed(extracted_document:, error_message:)
      @calls << :doc_failed
    end

    # Aggiorna i dati in base ai parametri ricevuti.
    def update_progress!(_run)
      { completed: true }
    end
  end

  class FakeNotifier
    attr_reader :events

    # Inizializza le dipendenze del componente.
    def initialize
      @events = []
    end

    # Invia l'output verso il canale previsto.
    def broadcast(job_id, payload)
      @events << [job_id, payload]
    end
  end

  class FakeFileStorage
    # Verifica le condizioni richieste prima di procedere.
    def exist?(_path)
      true
    end

    # Rimuove i dati previsti dal flusso corrente.
    def delete(_path)
      true
    end
  end

  class FakeResolution
    attr_reader :employee

    # Inizializza le dipendenze del componente.
    def initialize(employee)
      @employee = employee
    end

    # Verifica le condizioni richieste prima di procedere.
    def matched?
      true
    end
  end

  class FakeMetadataBuilder
    # Inizializza le dipendenze del componente.
    def initialize(metadata:, uploaded_document:)
      @metadata = metadata
    end

    # Costruisce i dati di output per il flusso corrente.
    def build
      @metadata
    end
  end

  class FakeConfidenceCalculator
    # Inizializza le dipendenze del componente.
    def initialize(**kwargs)
    end

    # Restituisce il valore di confidenza fittizio.
    def global_confidence
      { recipient: 0.9 }
    end
  end

  class FakeContainer
    attr_reader :data_item_repository, :notifier, :file_storage

    # Inizializza le dipendenze del componente.
    def initialize(repo:, notifier:, file_storage:, employee:)
      @data_item_repository = repo
      @notifier = notifier
      @file_storage = file_storage
      @employee = employee
    end

    # Restituisce il servizio OCR fittizio.
    def ocr_service
      Object.new.tap do |svc|
        svc.define_singleton_method(:full_ocr) { |_path| { text: "Mario Rossi", lines: [{ text: "Mario Rossi", confidence: 95 }] } }
      end
    end

    # Restituisce l'estrattore dati fittizio.
    def data_extractor
      Object.new.tap do |svc|
        svc.define_singleton_method(:extract) do |_text|
          { recipients: ["Mario Rossi"], metadata: { company: "ACME" }, llm_confidence: { recipient: 0.8 } }
        end
      end
    end

    # Restituisce il resolver fittizio per i destinatari.
    def recipient_resolver
      Object.new.tap do |svc|
        employee = @employee
        svc.define_singleton_method(:resolve) { |recipient_names:, raw_text:| FakeResolution.new(employee) }
      end
    end

    # Estrae e prepara i dati utili al processamento.
    def extracted_metadata_builder(**kwargs)
      FakeMetadataBuilder.new(**kwargs)
    end

    # Crea un calcolatore confidenza fittizio per il test.
    def confidence_calculator(**kwargs)
      FakeConfidenceCalculator.new(**kwargs)
    end
  end

  test "processes item and broadcasts success plus completion" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "mario@test.it", name: "Mario", username: "mario_pdi")
    employee = Employee.create!(user: u, company: company)
    uploaded = UploadedDocument.create!(original_filename: "x.pdf", storage_path: "/tmp/x", page_count: 1, checksum: "pdi-1", file_kind: "pdf", employee: employee)
    extracted = ExtractedDocument.create!(uploaded_document: uploaded, sequence: 1, page_start: 1, page_end: 1)

    run = ProcessingRun.create!(job_id: "job-pdi", total_documents: 1)
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "x.pdf", extracted_document: extracted)

    repo = FakeRepository.new(run: run, item: item, extracted_document: extracted)
    notifier = FakeNotifier.new
    file_storage = FakeFileStorage.new
    container = FakeContainer.new(repo: repo, notifier: notifier, file_storage: file_storage, employee: u)

    DocumentProcessing::ProcessDataItem.new(
      data_item_repository: container.data_item_repository,
      notifier: container.notifier,
      file_storage: container.file_storage,
      ocr_service: container.ocr_service,
      data_extractor: container.data_extractor,
      recipient_resolver: container.recipient_resolver,
      confidence_calculator_factory: container.method(:confidence_calculator),
      extracted_metadata_builder_factory: container.method(:extracted_metadata_builder)
    ).call(
      file_path: "/tmp/x.pdf",
      job_id: "job-pdi",
      processing_item_id: item.id,
      extracted_document_id: extracted.id
    )

    assert_includes repo.calls, :item_done
    assert_includes repo.calls, :doc_done
    assert_equal 2, notifier.events.size
    assert_equal "document_processed", notifier.events[0][1][:event]
    assert_equal "processing_completed", notifier.events[1][1][:event]
  end
end
