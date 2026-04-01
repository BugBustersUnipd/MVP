require "test_helper"

class InitializeFileProcessingTest < ActiveSupport::TestCase
  class FakeUploadManager
    attr_reader :saved

    # Inizializza le dipendenze del componente.
    def initialize(kind: :csv, checksum: "chk-1", path: "/tmp/f.csv")
      @kind = kind
      @checksum = checksum
      @path = path
      @saved = false
    end

    # Riconosce il tipo di file dalla diagnosi caricata.
    def detect_upload_kind(_file)
      @kind
    end

    # Restituisce il checksum predefinito per il test.
    def compute_checksum(_file)
      @checksum
    end

    
    def persist_supported_source_file(_file)
      @saved = true
      @path
    end
  end

  class FakeJob
    cattr_accessor :calls, default: []

    # Registra la chiamata al job nel log per verifica nel test.
    def self.perform_later(*args)
      self.calls << args
    end
  end

  test "creates uploaded document and enqueues generic file job" do
    upload_manager = FakeUploadManager.new(kind: :csv, checksum: "unique-checksum", path: "/tmp/source.csv")
    file = Struct.new(:original_filename).new("source.csv")

    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(email: "ifp#{SecureRandom.hex(4)}@test", username: "ifp#{SecureRandom.hex(4)}")
    employee = Employee.create!(user: user, company: company)

    command = DocumentProcessing::Commands::InitializeFileProcessing.new(
      upload_manager: upload_manager,
      generic_file_processing_job_class: FakeJob,
      file_storage: DocumentProcessing::Persistence::FileStorage.new
    )

    result = command.call(file: file, employee: employee)

    assert_equal "Pipeline avviata: analisi file in coda", result[:message]
    assert_not_nil result[:job_id]
    assert_not_nil result[:uploaded_document_id]
    assert_equal 1, FakeJob.calls.size
  ensure
    FakeJob.calls = []
  end
end
