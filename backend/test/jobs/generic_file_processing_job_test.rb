require "test_helper"

class GenericFileProcessingJobTest < ActiveSupport::TestCase
  class FakeProcessGenericFileService
    attr_reader :calls

    def initialize
      @calls = []
    end

    def call(file_path:, job_id:, uploaded_document_id:)
      @calls << {
        file_path: file_path,
        job_id: job_id,
        uploaded_document_id: uploaded_document_id
      }
    end
  end

  class FakeContainer
    attr_reader :last_file_kind

    def initialize(service)
      @service = service
    end

    def process_generic_file_service(file_kind:)
      @last_file_kind = file_kind
      @service
    end
  end

  def run_job(file_path, job_context, service: FakeProcessGenericFileService.new)
    container = FakeContainer.new(service)
    stub_new(DocumentProcessing::Container, container) do
      GenericFileProcessingJob.new.perform(file_path, job_context)
    end
    container
  end

  test "perform with symbol key context passes all fields correctly" do
    service = FakeProcessGenericFileService.new
    container = run_job("/tmp/file.csv", {
      job_id: "gfp-job",
      uploaded_document_id: 33,
      file_kind: "csv"
    }, service: service)

    assert_equal "csv", container.last_file_kind
    assert_equal 1, service.calls.size
    call = service.calls.first
    assert_equal "/tmp/file.csv", call[:file_path]
    assert_equal "gfp-job",       call[:job_id]
    assert_equal 33,              call[:uploaded_document_id]
  end

  test "perform with string key context normalizes correctly" do
    service = FakeProcessGenericFileService.new
    container = run_job("/tmp/scan.png", {
      "job_id" => "str-gfp",
      "uploaded_document_id" => 44,
      "file_kind" => "image"
    }, service: service)

    assert_equal "image", container.last_file_kind
    call = service.calls.first
    assert_equal "str-gfp", call[:job_id]
    assert_equal 44,        call[:uploaded_document_id]
  end

  test "perform with mixed keys picks up both symbol and string" do
    service = FakeProcessGenericFileService.new
    container = run_job("/tmp/mix.csv", {
      job_id: "mix-job",
      "uploaded_document_id" => 55,
      file_kind: "csv"
    }, service: service)

    assert_equal "csv", container.last_file_kind
    call = service.calls.first
    assert_equal "mix-job", call[:job_id]
    assert_equal 55,        call[:uploaded_document_id]
  end

  test "queue is :data" do
    assert_equal :data, GenericFileProcessingJob.queue_name.to_sym
  end
end
