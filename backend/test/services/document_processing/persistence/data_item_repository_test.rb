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

  # Crea un oggetto Resolution fittizio per il test.
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

    # Simulate a concurrent metadati PATCH
    ed.with_lock do
      ed.reload
      ed.update!(metadata: { "company" => "Company B" })
    end

    ed.reload
    assert_equal "Company B", ed.metadata["company"]
    assert_equal "User 1",    ed.recipient  # unrelated field unchanged
  end

  # ---------------------------------------------------------------------------
  # find_* helpers
  # ---------------------------------------------------------------------------

  test "find_run_by_job_id returns run when it exists" do
    run = ProcessingRun.create!(job_id: "find-run-#{SecureRandom.hex(4)}")
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_equal run, repo.find_run_by_job_id(run.job_id)
  end

  test "find_run_by_job_id returns nil for unknown job_id" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nil repo.find_run_by_job_id("does-not-exist")
  end

  test "find_processing_item returns item when it exists" do
    run  = ProcessingRun.create!(job_id: "find-item-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f")
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_equal item, repo.find_processing_item(item.id)
  end

  test "find_processing_item returns nil for missing id" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nil repo.find_processing_item(0)
  end

  test "find_extracted_document returns document when it exists" do
    _company, _u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "c.pdf", storage_path: "/tmp/c", page_count: 1,
                                   checksum: "dir-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_equal ed, repo.find_extracted_document(ed.id)
  end

  test "find_extracted_document returns nil for missing id" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nil repo.find_extracted_document(0)
  end

  # ---------------------------------------------------------------------------
  # mark_item_in_progress! e mark_extracted_document_in_progress!
  # ---------------------------------------------------------------------------

  test "mark_item_in_progress! transitions queued item to in_progress" do
    run  = ProcessingRun.create!(job_id: "mip-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "queued")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_item_in_progress!(item)

    assert_equal "in_progress", item.reload.status
  end

  test "mark_item_in_progress! does not change done item" do
    run  = ProcessingRun.create!(job_id: "mip2-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "done")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_item_in_progress!(item)

    assert_equal "done", item.reload.status
  end

  test "mark_item_in_progress! with nil item does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_item_in_progress!(nil) }
  end

  test "mark_extracted_document_in_progress! transitions queued document" do
    _company, _u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "d.pdf", storage_path: "/tmp/d", page_count: 1,
                                   checksum: "dir-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, status: "queued")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_extracted_document_in_progress!(ed)

    assert_equal "in_progress", ed.reload.status
  end

  test "mark_extracted_document_in_progress! with nil does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_extracted_document_in_progress!(nil) }
  end

  # ---------------------------------------------------------------------------
  # mark_item_done! e mark_item_failed
  # ---------------------------------------------------------------------------

  test "mark_item_done! updates item status to done" do
    run  = ProcessingRun.create!(job_id: "mid-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "in_progress")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    unmatched_resolution = Object.new.tap { |r| r.define_singleton_method(:matched?) { false } }

    repo.mark_item_done!(item: item, resolution: unmatched_resolution)

    assert_equal "done", item.reload.status
  end

  test "mark_item_done! with nil item does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    unmatched = Object.new.tap { |r| r.define_singleton_method(:matched?) { false } }
    assert_nothing_raised { repo.mark_item_done!(item: nil, resolution: unmatched) }
  end

  test "mark_item_failed updates item to failed with error message" do
    run  = ProcessingRun.create!(job_id: "mif-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "in_progress")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_item_failed(item: item, error_message: "Boom!")

    item.reload
    assert_equal "failed", item.status
    assert_equal "Boom!",  item.error_message
  end

  test "mark_item_failed with nil item does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_item_failed(item: nil, error_message: "x") }
  end

  # ---------------------------------------------------------------------------
  # mark_extracted_document_failed
  # ---------------------------------------------------------------------------

  test "mark_extracted_document_failed sets status to failed" do
    _company, _u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "e.pdf", storage_path: "/tmp/e", page_count: 1,
                                   checksum: "dir-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, status: "in_progress")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_extracted_document_failed(extracted_document: ed, error_message: "Error!")

    ed.reload
    assert_equal "failed", ed.status
    assert_equal "Error!", ed.error_message
  end

  test "mark_extracted_document_failed with nil does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_extracted_document_failed(extracted_document: nil, error_message: "x") }
  end

  # ---------------------------------------------------------------------------
  # update_progress! con nil run
  # ---------------------------------------------------------------------------

  test "update_progress! with nil run returns not completed" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    result = repo.update_progress!(nil)
    assert_equal false, result[:completed]
  end

  # ---------------------------------------------------------------------------
  # terminal_item?
  # ---------------------------------------------------------------------------

  test "terminal_item? returns true for done item" do
    run  = ProcessingRun.create!(job_id: "ti-done-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "done")
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert repo.terminal_item?(item)
  end

  test "terminal_item? returns true for failed item" do
    run  = ProcessingRun.create!(job_id: "ti-fail-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "failed")
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert repo.terminal_item?(item)
  end

  test "terminal_item? returns false for queued item" do
    run  = ProcessingRun.create!(job_id: "ti-q-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "queued")
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_not repo.terminal_item?(item)
  end

  test "terminal_item? returns false for nil" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_not repo.terminal_item?(nil)
  end

  # ---------------------------------------------------------------------------
  # mark_extracted_document_done! con unmatched resolution
  # ---------------------------------------------------------------------------

  test "mark_extracted_document_done! with unmatched resolution sets matched_employee to nil" do
    _company, _u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "f.pdf", storage_path: "/tmp/f", page_count: 1,
                                   checksum: "dir-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)

    unmatched_resolution = Object.new.tap { |r| r.define_singleton_method(:matched?) { false } }

    DocumentProcessing::Persistence::DataItemRepository.new.mark_extracted_document_done!(
      extracted_document:       ed,
      resolution:               unmatched_resolution,
      metadata:                 {},
      recipient:                "Unknown",
      global_confidence:        {},
      process_duration_seconds: 1.0
    )

    ed.reload
    assert_equal "done", ed.status
    assert_nil ed.matched_employee
  end

  # ---------------------------------------------------------------------------
  # mark_item_done! additional branches
  # ---------------------------------------------------------------------------

  test "mark_item_done! with already-done item does not update" do
    run  = ProcessingRun.create!(job_id: "mid-done-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "done")
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    unmatched = Object.new.tap { |r| r.define_singleton_method(:matched?) { false } }

    
    repo.mark_item_done!(item: item, resolution: unmatched)
    assert_equal "done", item.reload.status
  end

  test "mark_item_done! with matched resolution updates extracted_document matched_employee" do
    _company, u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "x.pdf", storage_path: "/tmp/x", page_count: 1,
                                   checksum: "dir-matched-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)
    run  = ProcessingRun.create!(job_id: "mid-match-#{SecureRandom.hex(4)}")
    item = ProcessingItem.create!(processing_run: run, sequence: 1, filename: "f", status: "in_progress",
                                   extracted_document: ed)
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    matched_resolution = Object.new.tap do |r|
      r.define_singleton_method(:matched?) { true }
      r.define_singleton_method(:employee) { u }
    end

    repo.mark_item_done!(item: item, resolution: matched_resolution)

    assert_equal u, ed.reload.matched_employee
  end

  test "mark_extracted_document_in_progress! with done document does not change status" do
    _company, _u, emp = build_deps
    ud = UploadedDocument.create!(original_filename: "z.pdf", storage_path: "/tmp/z", page_count: 1,
                                   checksum: "dir-edin-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, status: "done")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_extracted_document_in_progress!(ed)
    assert_equal "done", ed.reload.status
  end

  # ---------------------------------------------------------------------------
  # mark_run_* con nil run
  # ---------------------------------------------------------------------------

  test "mark_run_processing! with nil run does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_run_processing!(nil) }
  end

  test "set_run_total! with nil run does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.set_run_total!(nil, 5) }
  end

  test "mark_run_completed! with nil run does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_run_completed!(nil, processed_documents: 0) }
  end

  test "mark_run_failed! with nil run does not raise" do
    repo = DocumentProcessing::Persistence::DataItemRepository.new
    assert_nothing_raised { repo.mark_run_failed!(nil, error_message: "err") }
  end

  test "mark_run_failed! with actual run updates status" do
    run = ProcessingRun.create!(job_id: "mrf-#{SecureRandom.hex(4)}", status: "processing")
    repo = DocumentProcessing::Persistence::DataItemRepository.new

    repo.mark_run_failed!(run, error_message: "fail")
    assert_equal "failed", run.reload.status
  end
end
