require "test_helper"

class PdfSplitJobTest < ActiveSupport::TestCase
  class FakeProcessSplitRunService
    attr_reader :calls

    def initialize
      @calls = []
    end

    def call(file_path:, job_id:)
      @calls << { file_path: file_path, job_id: job_id }
    end
  end

  class FakeContainer
    attr_reader :split_run_service

    def initialize(service)
      @split_run_service = service
    end

    def process_split_run_service
      @split_run_service
    end
  end

  test "perform calls process_split_run_service with correct args" do
    service = FakeProcessSplitRunService.new
    container = FakeContainer.new(service)

    stub_new(DocumentProcessing::Container, container) do
      PdfSplitJob.new.perform("/tmp/source.pdf", "job-abc")
    end

    assert_equal 1, service.calls.size
    assert_equal "/tmp/source.pdf", service.calls.first[:file_path]
    assert_equal "job-abc",         service.calls.first[:job_id]
  end

  test "perform extracts job_id from hash context" do
    service = FakeProcessSplitRunService.new
    container = FakeContainer.new(service)

    stub_new(DocumentProcessing::Container, container) do
      PdfSplitJob.new.perform("/tmp/source.pdf", { job_id: "hash-job-id" })
    end

    assert_equal "hash-job-id", service.calls.first[:job_id]
  end

  test "perform extracts job_id from hash with string keys" do
    service = FakeProcessSplitRunService.new
    container = FakeContainer.new(service)

    stub_new(DocumentProcessing::Container, container) do
      PdfSplitJob.new.perform("/tmp/source.pdf", { "job_id" => "string-key-job" })
    end

    assert_equal "string-key-job", service.calls.first[:job_id]
  end

  test "perform uses string job_id when not a hash" do
    service = FakeProcessSplitRunService.new
    container = FakeContainer.new(service)

    stub_new(DocumentProcessing::Container, container) do
      PdfSplitJob.new.perform("/tmp/source.pdf", "plain-job-id")
    end

    assert_equal "plain-job-id", service.calls.first[:job_id]
  end

  test "queue is :split" do
    assert_equal :split, PdfSplitJob.queue_name.to_sym
  end
end
