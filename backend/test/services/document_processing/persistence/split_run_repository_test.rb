require "test_helper"

class DocumentProcessing::Persistence::SplitRunRepositoryTest < ActiveSupport::TestCase
  test "create_split_artifacts creates processing items and extracted documents" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "split@test", name: "SplitUser", username: "splituser")
    emp = Employee.create!(user: u, company: company)

    uploaded = UploadedDocument.create!(
      original_filename: "source.pdf",
      storage_path: "/tmp/source.pdf",
      page_count: 2,
      checksum: "split-repo-1",
      file_kind: "pdf",
      employee: emp
    )
    run = ProcessingRun.create!(job_id: "split-job-1", uploaded_document: uploaded)

    repo = DocumentProcessing::Persistence::SplitRunRepository.new
    artifacts = repo.create_split_artifacts!(
      run: run,
      split_results: [
        { range: { start: 0, end: 0 }, path: "/tmp/mini_1.pdf" },
        { range: { start: 1, end: 1 }, path: "/tmp/mini_2.pdf" }
      ]
    )

    assert_equal 2, artifacts.size
    assert_equal 2, run.processing_items.count
    assert_equal 2, uploaded.extracted_documents.count
  end

  test "mark_post_split_state marks completed when split_count is zero" do
    run = ProcessingRun.create!(job_id: "split-job-2", status: "queued")
    repo = DocumentProcessing::Persistence::SplitRunRepository.new

    repo.mark_post_split_state!(run: run, split_count: 0)
    run.reload

    assert_equal "completed", run.status
    assert_equal 0, run.total_documents
    assert_equal 0, run.processed_documents
    assert_not_nil run.completed_at
  end

  test "mark_post_split_state marks processing when split_count > 0" do
    run = ProcessingRun.create!(job_id: "split-job-3", status: "splitting")
    repo = DocumentProcessing::Persistence::SplitRunRepository.new

    repo.mark_post_split_state!(run: run, split_count: 3)
    run.reload

    assert_equal "processing", run.status
    assert_equal 3, run.total_documents
    assert_equal 0, run.processed_documents
    assert_nil run.completed_at
  end

  test "mark_splitting! updates run status to splitting" do
    run = ProcessingRun.create!(job_id: "split-job-4", status: "queued")
    repo = DocumentProcessing::Persistence::SplitRunRepository.new

    repo.mark_splitting!(run)
    run.reload

    assert_equal "splitting", run.status
    assert_not_nil run.started_at
  end

  test "mark_failed sets status to failed with error message" do
    run = ProcessingRun.create!(job_id: "split-job-fail", status: "splitting")
    repo = DocumentProcessing::Persistence::SplitRunRepository.new

    repo.mark_failed(run: run, error_message: "Something went wrong")
    run.reload

    assert_equal "failed", run.status
    assert_equal "Something went wrong", run.error_message
    assert_not_nil run.completed_at
  end

  test "mark_failed with nil run does not raise" do
    repo = DocumentProcessing::Persistence::SplitRunRepository.new
    assert_nothing_raised { repo.mark_failed(run: nil, error_message: "x") }
  end

  test "find_run_by_job_id! finds existing run" do
    run = ProcessingRun.create!(job_id: "split-find-1")
    repo = DocumentProcessing::Persistence::SplitRunRepository.new
    assert_equal run, repo.find_run_by_job_id!("split-find-1")
  end

  test "find_run_by_job_id! raises for unknown job_id" do
    repo = DocumentProcessing::Persistence::SplitRunRepository.new
    assert_raises(ActiveRecord::RecordNotFound) { repo.find_run_by_job_id!("does-not-exist-ever") }
  end

  test "uploaded_source_path_for returns storage path from run" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "src#{SecureRandom.hex(4)}@test", name: "SrcUser", username: "srcuser#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: u, company: company)
    uploaded = UploadedDocument.create!(
      original_filename: "x.pdf", storage_path: "/storage/x.pdf",
      page_count: 1, checksum: "path-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp
    )
    run = ProcessingRun.create!(job_id: "split-path-1", uploaded_document: uploaded)
    repo = DocumentProcessing::Persistence::SplitRunRepository.new

    assert_equal "/storage/x.pdf", repo.uploaded_source_path_for(run)
  end

  test "uploaded_source_path_for returns nil for nil run" do
    repo = DocumentProcessing::Persistence::SplitRunRepository.new
    assert_nil repo.uploaded_source_path_for(nil)
  end

  test "create_split_artifacts! with run having no uploaded_document skips extracted_documents" do
    run = ProcessingRun.create!(job_id: "split-no-ud-#{SecureRandom.hex(4)}", status: "splitting")
    repo = DocumentProcessing::Persistence::SplitRunRepository.new

    artifacts = repo.create_split_artifacts!(
      run: run,
      split_results: [
        { range: { start: 0, end: 0 }, path: "/tmp/mini_noUD_1.pdf" }
      ]
    )

    assert_equal 1, artifacts.size
    assert_equal 1, run.processing_items.count
    # No uploaded_document → extracted_documents count is 0
    assert_equal 0, ExtractedDocument.where(uploaded_document_id: nil).count.tap {} # relation doesn't apply
    assert_nil artifacts.first[:extracted_document_id]
  end
end
