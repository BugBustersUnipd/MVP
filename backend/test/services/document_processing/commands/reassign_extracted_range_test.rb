require "test_helper"

class ReassignExtractedRangeTest < ActiveSupport::TestCase
  class FakePageRangePdf
    def initialize(source_pdf_path:)
      @source_pdf_path = source_pdf_path
    end

    def build_temp_pdf(page_start:, page_end:)
      "/tmp/reassigned_#{page_start}_#{page_end}.pdf"
    end
  end

  class FakeDataExtractionJob
    cattr_accessor :calls, default: []

    def self.perform_later(*args)
      self.calls << args
    end
  end

  class FakeFileStorage
    def exist?(_path)
      true
    end
  end

  class FakeFileStorageMissing
    def exist?(_path)
      false
    end
  end

  test "reassigns range and enqueues extraction" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "reassign@test", name: "Reassign", username: "reassign")
    emp = Employee.create!(user: u, company: company)

    uploaded = UploadedDocument.create!(
      original_filename: "source.pdf",
      storage_path: "/tmp/source.pdf",
      page_count: 5,
      checksum: "reassign-1",
      file_kind: "pdf",
      employee: emp
    )

    extracted = ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1,
      page_start: 1,
      page_end: 2,
      status: "done",
      metadata: { "a" => 1 },
      recipient: "Mario",
      confidence: { "recipient" => 0.9 }
    )

    run = ProcessingRun.create!(
      job_id: "reassign-job-#{SecureRandom.hex(4)}",
      status: "processing",
      uploaded_document: uploaded,
      total_documents: 1,
      processed_documents: 0
    )
    item = ProcessingItem.create!(
      processing_run: run,
      extracted_document: extracted,
      sequence: 1,
      filename: "source_1.pdf",
      status: "done"
    )

    command = DocumentProcessing::Commands::ReassignExtractedRange.new(
      page_range_pdf_service_class: FakePageRangePdf,
      data_extraction_job_class: FakeDataExtractionJob,
      file_storage: FakeFileStorage.new
    )

    result = command.call(extracted_document_id: extracted.id, page_start: 2, page_end: 3)
    extracted.reload

    assert_equal extracted.id, result[:extracted_document_id]
    assert_equal run.job_id, result[:job_id]
    assert_equal "queued", extracted.status
    assert_equal "queued", item.reload.status
    assert_equal({}, extracted.metadata)
    assert_nil extracted.recipient
    assert_equal 1, FakeDataExtractionJob.calls.size
    args = FakeDataExtractionJob.calls.first
    assert_equal "/tmp/reassigned_2_3.pdf", args[0]
    assert_equal run.job_id, args[1][:job_id]
    assert_equal item.id, args[1][:processing_item_id]
    assert_equal extracted.id, args[1][:extracted_document_id]
  ensure
    FakeDataExtractionJob.calls = []
  end

  test "raises validation error for invalid range" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "reassign2@test", name: "Reassign2", username: "reassign2")
    emp = Employee.create!(user: u, company: company)

    uploaded = UploadedDocument.create!(
      original_filename: "source.pdf",
      storage_path: "/tmp/source.pdf",
      page_count: 2,
      checksum: "reassign-2",
      file_kind: "pdf",
      employee: emp
    )
    extracted = ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1,
      page_start: 1,
      page_end: 1,
      status: "done"
    )

    command = DocumentProcessing::Commands::ReassignExtractedRange.new(
      page_range_pdf_service_class: FakePageRangePdf,
      data_extraction_job_class: FakeDataExtractionJob,
      file_storage: FakeFileStorage.new
    )

    assert_raises(DocumentProcessing::Commands::ReassignExtractedRange::ValidationError) do
      command.call(extracted_document_id: extracted.id, page_start: 0, page_end: 0)
    end
  end

  test "returns ok:false when source PDF does not exist in file storage" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "reassign3@test", name: "Reassign3", username: "reassign3")
    emp = Employee.create!(user: u, company: company)

    uploaded = UploadedDocument.create!(
      original_filename: "missing.pdf",
      storage_path: "/tmp/missing.pdf",
      page_count: 5,
      checksum: "reassign-missing-#{SecureRandom.hex(4)}",
      file_kind: "pdf",
      employee: emp
    )
    extracted = ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1,
      page_start: 1,
      page_end: 1,
      status: "done"
    )

    command = DocumentProcessing::Commands::ReassignExtractedRange.new(
      page_range_pdf_service_class: FakePageRangePdf,
      data_extraction_job_class: FakeDataExtractionJob,
      file_storage: FakeFileStorageMissing.new
    )

    result = command.call(extracted_document_id: extracted.id, page_start: 1, page_end: 2)

    assert_equal false, result[:ok]
    assert_equal :validation, result[:error]
  end

  test "raises validation error when page_end exceeds document page_count" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "reassign4@test", name: "Reassign4", username: "reassign4")
    emp = Employee.create!(user: u, company: company)

    uploaded = UploadedDocument.create!(
      original_filename: "short.pdf",
      storage_path: "/tmp/short.pdf",
      page_count: 2,
      checksum: "reassign-short-#{SecureRandom.hex(4)}",
      file_kind: "pdf",
      employee: emp
    )
    extracted = ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1,
      page_start: 1,
      page_end: 1,
      status: "done"
    )

    command = DocumentProcessing::Commands::ReassignExtractedRange.new(
      page_range_pdf_service_class: FakePageRangePdf,
      data_extraction_job_class: FakeDataExtractionJob,
      file_storage: FakeFileStorage.new
    )

    assert_raises(DocumentProcessing::Commands::ReassignExtractedRange::ValidationError) do
      command.call(extracted_document_id: extracted.id, page_start: 1, page_end: 5)
    end
  end

  test "raises validation error when page_start is not an integer" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "reassign5@test", name: "Reassign5", username: "reassign5")
    emp = Employee.create!(user: u, company: company)

    uploaded = UploadedDocument.create!(
      original_filename: "any.pdf",
      storage_path: "/tmp/any.pdf",
      page_count: 5,
      checksum: "reassign-nonint-#{SecureRandom.hex(4)}",
      file_kind: "pdf",
      employee: emp
    )
    extracted = ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1,
      page_start: 1,
      page_end: 1,
      status: "done"
    )

    command = DocumentProcessing::Commands::ReassignExtractedRange.new(
      page_range_pdf_service_class: FakePageRangePdf,
      data_extraction_job_class: FakeDataExtractionJob,
      file_storage: FakeFileStorage.new
    )

    assert_raises(DocumentProcessing::Commands::ReassignExtractedRange::ValidationError) do
      command.call(extracted_document_id: extracted.id, page_start: "one", page_end: 3)
    end
  end
end
