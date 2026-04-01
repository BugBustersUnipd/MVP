require "test_helper"

class DataExtractionJobTest < ActiveSupport::TestCase
  class FakeProcessDataItemService
    attr_reader :calls

    # Inizializza le dipendenze del componente.
    def initialize
      @calls = []
    end

    # Esegue il flusso principale del servizio.
    def call(file_path:, job_id:, processing_item_id:, extracted_document_id:)
      @calls << {
        file_path: file_path,
        job_id: job_id,
        processing_item_id: processing_item_id,
        extracted_document_id: extracted_document_id
      }
    end
  end

  class FakeContainer
    # Inizializza le dipendenze del componente.
    def initialize(service)
      @service = service
    end

    
    def process_data_item_service
      @service
    end
  end

  # Metodo di supporto per i test.
  def run_job(file_path, job_context, processing_item_id = nil, extracted_document_id = nil, service: FakeProcessDataItemService.new)
    container = FakeContainer.new(service)
    stub_new(DocumentProcessing::Container, container) do
      DataExtractionJob.new.perform(file_path, job_context, processing_item_id, extracted_document_id)
    end
    service
  end

  test "perform with positional args passes them through correctly" do
    service = run_job("/tmp/item.pdf", "job-123", 10, 20)

    assert_equal 1, service.calls.size
    call = service.calls.first
    assert_equal "/tmp/item.pdf", call[:file_path]
    assert_equal "job-123",       call[:job_id]
    assert_equal 10,              call[:processing_item_id]
    assert_equal 20,              call[:extracted_document_id]
  end

  test "perform with hash context (symbol keys) normalizes correctly" do
    service = run_job("/tmp/item.pdf", {
      job_id: "hash-job",
      processing_item_id: 5,
      extracted_document_id: 7
    })

    call = service.calls.first
    assert_equal "hash-job", call[:job_id]
    assert_equal 5,          call[:processing_item_id]
    assert_equal 7,          call[:extracted_document_id]
  end

  test "perform with hash context (string keys) normalizes correctly" do
    service = run_job("/tmp/item.pdf", {
      "job_id" => "str-job",
      "processing_item_id" => 3,
      "extracted_document_id" => 9
    })

    call = service.calls.first
    assert_equal "str-job", call[:job_id]
    assert_equal 3,         call[:processing_item_id]
    assert_equal 9,         call[:extracted_document_id]
  end

  test "perform with nil job_context falls back to positional args" do
    service = run_job("/tmp/item.pdf", nil, 11, 22)

    call = service.calls.first
    assert_nil call[:job_id]
    assert_equal 11, call[:processing_item_id]
    assert_equal 22, call[:extracted_document_id]
  end

  test "queue is :data" do
    assert_equal :data, DataExtractionJob.queue_name.to_sym
  end
end
