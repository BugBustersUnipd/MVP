require "test_helper"

class ContainerTest < ActiveSupport::TestCase
  class FakeOcr
    attr_reader :client

    def initialize(textract_client:)
      @client = textract_client
    end
  end

  class FakeExtractor
    attr_reader :llm

    def initialize(llm_service:)
      @llm = llm_service
    end
  end

  class FakeLlm
    attr_reader :client

    def initialize(bedrock_client:)
      @client = bedrock_client
    end
  end

  class FakeNotifier
    attr_reader :calls

    def initialize(broadcaster:)
      @broadcaster = broadcaster
      @calls = []
    end

    def broadcast(job_id, payload)
      @calls << [job_id, payload]
    end
  end

  class FakeFileStorage
    def exist?(_path)
      false
    end
  end

  test "builds services with injected dependencies" do
    textract = Object.new
    bedrock = Object.new

    container = DocumentProcessing::Container.new(
      ocr_service_class: FakeOcr,
      data_extractor_class: FakeExtractor,
      llm_service_class: FakeLlm,
      notifier_class: FakeNotifier,
      file_storage_class: FakeFileStorage,
      textract_client: textract,
      bedrock_client: bedrock
    )

    assert_same textract, container.ocr_service.client
    assert_same bedrock, container.data_extractor.llm.client
    assert_instance_of FakeFileStorage, container.file_storage
  end

  test "broadcast delegates to notifier" do
    container = DocumentProcessing::Container.new(notifier_class: FakeNotifier)

    container.broadcast("job-x", { event: "ping" })

    assert_equal 1, container.notifier.calls.size
    assert_equal "job-x", container.notifier.calls.first[0]
  end

  # ---------------------------------------------------------------------------
  # Persistence services
  # ---------------------------------------------------------------------------

  test "file_storage is memoized" do
    container = DocumentProcessing::Container.new(file_storage_class: FakeFileStorage)
    assert_same container.file_storage, container.file_storage
  end

  test "data_item_repository returns DataItemRepository instance" do
    container = DocumentProcessing::Container.new(
      data_item_repository_class: DocumentProcessing::Persistence::DataItemRepository
    )
    assert_instance_of DocumentProcessing::Persistence::DataItemRepository, container.data_item_repository
  end

  test "data_item_repository is memoized" do
    container = DocumentProcessing::Container.new
    assert_same container.data_item_repository, container.data_item_repository
  end

  test "split_run_repository returns SplitRunRepository instance" do
    container = DocumentProcessing::Container.new
    assert_instance_of DocumentProcessing::Persistence::SplitRunRepository, container.split_run_repository
  end

  test "split_run_repository is memoized" do
    container = DocumentProcessing::Container.new
    assert_same container.split_run_repository, container.split_run_repository
  end

  test "recipient_resolver is memoized" do
    container = DocumentProcessing::Container.new
    assert_same container.recipient_resolver, container.recipient_resolver
  end

  test "upload_manager is memoized" do
    container = DocumentProcessing::Container.new
    assert_same container.upload_manager, container.upload_manager
  end

  test "db_manager is memoized" do
    container = DocumentProcessing::Container.new
    assert_same container.db_manager, container.db_manager
  end

  test "page_range_pdf_service_class returns the class" do
    container = DocumentProcessing::Container.new
    assert_equal DocumentProcessing::PageRangePdf, container.page_range_pdf_service_class
  end

  # ---------------------------------------------------------------------------
  # Command builders
  # ---------------------------------------------------------------------------

  test "initialize_processing_command returns InitializeProcessing instance" do
    container = DocumentProcessing::Container.new
    cmd = container.initialize_processing_command
    assert_instance_of DocumentProcessing::Commands::InitializeProcessing, cmd
  end

  test "initialize_file_processing_command returns InitializeFileProcessing instance" do
    container = DocumentProcessing::Container.new
    cmd = container.initialize_file_processing_command
    assert_instance_of DocumentProcessing::Commands::InitializeFileProcessing, cmd
  end

  test "reassign_extracted_range_command returns ReassignExtractedRange instance" do
    container = DocumentProcessing::Container.new
    cmd = container.reassign_extracted_range_command
    assert_instance_of DocumentProcessing::Commands::ReassignExtractedRange, cmd
  end

  # ---------------------------------------------------------------------------
  # Processor service builders
  # ---------------------------------------------------------------------------

  test "process_data_item_service returns ProcessDataItem instance" do
    container = DocumentProcessing::Container.new(
      ocr_service_class: FakeOcr,
      data_extractor_class: FakeExtractor,
      llm_service_class: FakeLlm,
      notifier_class: FakeNotifier,
      file_storage_class: FakeFileStorage,
      textract_client: Object.new,
      bedrock_client: Object.new
    )
    svc = container.process_data_item_service
    assert_instance_of DocumentProcessing::ProcessDataItem, svc
  end

  test "process_split_run_service returns ProcessSplitRun instance" do
    container = DocumentProcessing::Container.new(
      notifier_class: FakeNotifier,
      file_storage_class: FakeFileStorage
    )
    svc = container.process_split_run_service
    assert_instance_of DocumentProcessing::ProcessSplitRun, svc
  end

  test "process_generic_file_service returns ProcessGenericFile instance for csv" do
    container = DocumentProcessing::Container.new(
      ocr_service_class: FakeOcr,
      data_extractor_class: FakeExtractor,
      llm_service_class: FakeLlm,
      notifier_class: FakeNotifier,
      file_storage_class: FakeFileStorage,
      textract_client: Object.new,
      bedrock_client: Object.new
    )
    svc = container.process_generic_file_service(file_kind: "csv")
    assert_instance_of DocumentProcessing::ProcessGenericFile, svc
  end

  test "process_generic_file_service returns ProcessGenericFile instance for image" do
    container = DocumentProcessing::Container.new(
      ocr_service_class: FakeOcr,
      data_extractor_class: FakeExtractor,
      llm_service_class: FakeLlm,
      notifier_class: FakeNotifier,
      file_storage_class: FakeFileStorage,
      textract_client: Object.new,
      bedrock_client: Object.new
    )
    svc = container.process_generic_file_service(file_kind: "image")
    assert_instance_of DocumentProcessing::ProcessGenericFile, svc
  end

  test "file_processor raises for unknown file_kind" do
    container = DocumentProcessing::Container.new
    assert_raises(ArgumentError) { container.file_processor("docx") }
  end
end
