require "test_helper"

class DocumentProcessing::Persistence::DataItemRepositoryTest < ActiveSupport::TestCase
  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  def build_deps
    company = Company.first || Company.create!(name: "TestCo")
    u       = User.create!(email: "u#{SecureRandom.hex(4)}@test.com", name: "Test User", username: "u#{SecureRandom.hex(4)}")
    emp     = Employee.create!(user: u, company: company)
    [company, u, emp]
  end

  def fake_resolution(user)
    Struct.new(:matched?, :employee, keyword_init: false).new.tap do |r|
      r.define_singleton_method(:matched?) { true }
      r.define_singleton_method(:employee) { user }
    end
  end

  # ---------------------------------------------------------------------------
  # mark_extracted_document_done!
  # ---------------------------------------------------------------------------

  test "mark_extracted_document_done! sets status, metadata and recipient" do
    _company, u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "a.pdf", storage_path: "/tmp/a", page_count: 1,
                                   checksum: "dir-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)

    metadata   = { "company" => "Test Corp" }
    resolution = fake_resolution(u)

    DocumentProcessing::Persistence::DataItemRepository.new.mark_extracted_document_done!(
      extracted_document:      ed,
      resolution:              resolution,
      metadata:                metadata,
      recipient:               "John Doe",
      global_confidence:       { "company" => 0.9 },
      process_duration_seconds: 5.0
    )

    ed.reload
    assert_equal "done",       ed.status
    assert_equal metadata,     ed.metadata
    assert_equal "John Doe",   ed.recipient
    assert_equal u,            ed.matched_employee
  end

  # ---------------------------------------------------------------------------
  # update_progress!
  # ---------------------------------------------------------------------------

  test "update_progress! counts done/failed items and marks run completed" do
    run = ProcessingRun.create!(job_id: "job-#{SecureRandom.hex(4)}", total_documents: 3,
                                 original_filename: "test.pdf", processed_documents: 0)

    ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f1", status: "done")
    ProcessingItem.create!(processing_run: run, sequence: 2, filename: "f2", status: "done")
    ProcessingItem.create!(processing_run: run, sequence: 3, filename: "f3", status: "queued")

    repo   = DocumentProcessing::Persistence::DataItemRepository.new
    result = repo.update_progress!(run)

    run.reload
    assert_equal 2,     run.processed_documents
    assert_equal false, result[:completed]

    ProcessingItem.where(processing_run: run, sequence: 3).update_all(status: "done")
    result = repo.update_progress!(run)

    run.reload
    assert_equal 3,         run.processed_documents
    assert_equal true,      result[:completed]
    assert_equal "completed", run.status
    assert_not_nil run.completed_at
  end

  # ---------------------------------------------------------------------------
  # Optimistic locking — second write doesn't overwrite unrelated fields
  # ---------------------------------------------------------------------------

  test "with_lock on extracted_document is atomic" do
    _company, u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "b.pdf", storage_path: "/tmp/b", page_count: 1,
                                   checksum: "dir-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)

    repo       = DocumentProcessing::Persistence::DataItemRepository.new
    resolution = fake_resolution(u)

    repo.mark_extracted_document_done!(
      extracted_document:      ed,
      resolution:              resolution,
      metadata:                { "company" => "Company A" },
      recipient:               "User 1",
      global_confidence:       {},
      process_duration_seconds: 3.0
    )

    ed.reload
    assert_equal "Company A", ed.metadata["company"]
    assert_equal "User 1",    ed.recipient

    # Simulate a concurrent metadata PATCH
    ed.with_lock do
      ed.reload
      ed.update!(metadata: { "company" => "Company B" })
    end

    ed.reload
    assert_equal "Company B", ed.metadata["company"]
    assert_equal "User 1",    ed.recipient  # unrelated field unchanged
  end
end
