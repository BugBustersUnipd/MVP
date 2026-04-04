require "test_helper"

class ProcessGenericFileTest < ActiveSupport::TestCase
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

  class FakeResolution
    # Inizializza le dipendenze del componente.
    def initialize(employee)
      @employee = employee
    end

    # Verifica le condizioni richieste prima di procedere.
    def matched?
      @employee.present?
    end

    attr_reader :employee
  end

  class FakeRecipientResolver
    # Chiama resolve e restituisce una risoluzione fittizio.
    def resolve(recipient_names:, raw_text:)
      user = User.new(id: 10, name: recipient_names.first, email: "person@example.com", username: "person10")
      FakeResolution.new(user)
    end
  end

  class FakeContainer
    attr_reader :notifier

    # Inizializza le dipendenze del componente.
    def initialize
      @notifier = FakeNotifier.new
    end

    # Restituisce il resolver fittizio per i destinatari.
    def recipient_resolver
      FakeRecipientResolver.new
    end

    # Restituisce l'estrattore dati fittizio.
    def data_extractor
      Object.new.tap do |extractor|
        extractor.define_singleton_method(:extract) do |text|
          recipient = text.include?("Mario Rossi") ? "Mario Rossi" : nil
          {
            recipients: [recipient].compact,
            metadata: { amount: "100" },
            llm_confidence: { recipient: 0.9 }
          }
        end
      end
    end

    
    def file_storage
      Object.new.tap do |storage|
        storage.define_singleton_method(:exist?) { |_path| false }
        storage.define_singleton_method(:delete) { |_path| true }
      end
    end
  end

  test "csv processing emits uniform document_processed payload" do
    company = Company.first || Company.create!(name: "TestCo")
    u_csv = User.create!(email: "u_csv@test", name: "CSV User", username: "csvuser")
    emp_csv = Employee.create!(user: u_csv, company: company)
    uploaded_document = UploadedDocument.create!(
      original_filename: "records.csv",
      storage_path: "/tmp/records.csv",
      page_count: 1,
      checksum: "csv-checksum-1",
      file_kind: "csv",
      employee: emp_csv
    )

    run = ProcessingRun.create!(
      job_id: "job-csv-1",
      status: "queued",
      original_filename: uploaded_document.original_filename,
      uploaded_document: uploaded_document
    )

    csv = Tempfile.new(["rows", ".csv"])
    csv.write("recipient,amount\nMario Rossi,100\n")
    csv.rewind

    container = FakeContainer.new
    file_processor = DocumentProcessing::CsvProcessor.new(
      data_extractor: container.data_extractor,
      recipient_resolver: container.recipient_resolver
    )

    DocumentProcessing::ProcessGenericFile.new(
      notifier: container.notifier,
      file_storage: container.file_storage,
      generic_file_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      file_processor: file_processor
    ).call(
      file_path: csv.path,
      job_id: run.job_id,
      uploaded_document_id: uploaded_document.id
    )

    document_event = container.notifier.events.find { |_job_id, payload| payload[:event] == "document_processed" }
    completed_event = container.notifier.events.find { |_job_id, payload| payload[:event] == "processing_completed" }

    assert_not_nil document_event
    assert_not_nil completed_event

    payload = document_event[1]
    expected_keys = %i[event status filename ocr_text recipient extracted_document_data extracted_confidence matched_recipient extracted_document_id document_index total_documents message]
    assert_equal expected_keys.sort, payload.keys.sort
    assert_equal "success", payload[:status]
    assert_equal "records.csv", payload[:filename]
    assert_nil payload[:ocr_text]
    assert_equal "Mario Rossi", payload[:recipient]
    assert_equal 1, payload[:document_index]
    assert_equal 1, payload[:total_documents]
  ensure
    csv.close! if csv
  end

  test "csv with multiple rows is processed as single extracted document" do
    company = Company.first || Company.create!(name: "TestCo")
    u_csv = User.create!(email: "u_csv_multi@test", name: "CSV Multi", username: "csvmulti")
    emp_csv = Employee.create!(user: u_csv, company: company)
    uploaded_document = UploadedDocument.create!(
      original_filename: "records_multi.csv",
      storage_path: "/tmp/records_multi.csv",
      page_count: 1,
      checksum: "csv-checksum-multi-1",
      file_kind: "csv",
      employee: emp_csv
    )

    run = ProcessingRun.create!(
      job_id: "job-csv-multi-1",
      status: "queued",
      original_filename: uploaded_document.original_filename,
      uploaded_document: uploaded_document
    )

    csv = Tempfile.new(["rows_multi", ".csv"])
    csv.write("recipient,amount\nMario Rossi,100\nLuigi Bianchi,200\n")
    csv.rewind

    container = FakeContainer.new
    file_processor = DocumentProcessing::CsvProcessor.new(
      data_extractor: container.data_extractor,
      recipient_resolver: container.recipient_resolver
    )

    DocumentProcessing::ProcessGenericFile.new(
      notifier: container.notifier,
      file_storage: container.file_storage,
      generic_file_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      file_processor: file_processor
    ).call(
      file_path: csv.path,
      job_id: run.job_id,
      uploaded_document_id: uploaded_document.id
    )

    run.reload
    assert_equal 1, run.total_documents
    assert_equal 1, run.processed_documents

    extracted = uploaded_document.extracted_documents
    assert_equal 1, extracted.count
    assert_equal "Mario Rossi", extracted.first.recipient
  ensure
    csv.close! if csv
  end

  test "image processing emits uniform document_processed payload" do
    company = Company.first || Company.create!(name: "TestCo")
    u_img = User.create!(email: "img@test", name: "ImgUser", username: "imguser")
    emp_img = Employee.create!(user: u_img, company: company)
    uploaded_document = UploadedDocument.create!(
      original_filename: "scan.png",
      storage_path: "/tmp/scan.png",
      page_count: 1,
      checksum: "img-checksum-1",
      file_kind: "image",
      employee: emp_img
    )

    run = ProcessingRun.create!(
      job_id: "job-img-1",
      status: "queued",
      original_filename: uploaded_document.original_filename,
      uploaded_document: uploaded_document
    )

    mario = User.create!(email: "mario@example.com", name: "Mario Rossi", username: "mario_img")

    fake_image_processor = Object.new
    fake_image_processor.define_singleton_method(:call) do |_path|
      {
        ocr_text: "Mario Rossi fattura",
        ocr_lines: [],
        metadata: { "type" => "fattura" },
        confidence: { "recipient" => 0.9 },
        recipient: "Mario Rossi",
        employee: mario
      }
    end

    container = FakeContainer.new

    DocumentProcessing::ProcessGenericFile.new(
      notifier: container.notifier,
      file_storage: container.file_storage,
      generic_file_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      file_processor: fake_image_processor
    ).call(
      file_path: "/tmp/scan.png",
      job_id: run.job_id,
      uploaded_document_id: uploaded_document.id
    )

    document_event = container.notifier.events.find { |_job_id, payload| payload[:event] == "document_processed" }
    completed_event = container.notifier.events.find { |_job_id, payload| payload[:event] == "processing_completed" }

    assert_not_nil document_event
    assert_not_nil completed_event

    payload = document_event[1]
    expected_keys = %i[event status filename ocr_text recipient extracted_document_data extracted_confidence matched_recipient extracted_document_id document_index total_documents message]
    assert_equal expected_keys.sort, payload.keys.sort
    assert_equal "success", payload[:status]
    assert_equal "scan.png", payload[:filename]
    assert_equal "Mario Rossi fattura", payload[:ocr_text]
    assert_equal "Mario Rossi", payload[:recipient]
    assert_equal 1, payload[:document_index]
    assert_equal 1, payload[:total_documents]
    assert_equal "mario@example.com", payload[:matched_recipient][:email]
  end

  test "does not delete persisted source file after generic processing" do
    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(email: "keep-source@test", name: "Keep Source", username: "keepsource")
    employee = Employee.create!(user: user, company: company)

    csv = Tempfile.new(["source_keep", ".csv"])
    csv.write("recipient,amount\nMario Rossi,100\n")
    csv.rewind

    uploaded_document = UploadedDocument.create!(
      original_filename: "source_keep.csv",
      storage_path: csv.path,
      page_count: 1,
      checksum: "csv-keep-source-1",
      file_kind: "csv",
      employee: employee
    )

    run = ProcessingRun.create!(
      job_id: "job-csv-keep-source-1",
      status: "queued",
      original_filename: uploaded_document.original_filename,
      uploaded_document: uploaded_document
    )

    deleted_paths = []
    storage_spy = Object.new
    storage_spy.define_singleton_method(:exist?) { |path| File.exist?(path) }
    storage_spy.define_singleton_method(:delete) { |path| deleted_paths << path }

    container = FakeContainer.new
    file_processor = DocumentProcessing::CsvProcessor.new(
      data_extractor: container.data_extractor,
      recipient_resolver: container.recipient_resolver
    )

    DocumentProcessing::ProcessGenericFile.new(
      notifier: container.notifier,
      file_storage: storage_spy,
      generic_file_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      file_processor: file_processor
    ).call(
      file_path: csv.path,
      job_id: run.job_id,
      uploaded_document_id: uploaded_document.id
    )

    assert_equal [], deleted_paths
    assert File.exist?(csv.path)
  ensure
    csv.close! if csv
  end
end
