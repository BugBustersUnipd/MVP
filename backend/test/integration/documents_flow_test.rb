require "test_helper"

# Integration tests for DocumentsController.
# Tests that require AWS (split, process_file full pipeline) use DB-only paths
# (dedup, list, show, validate) to avoid external dependencies.
class DocumentsFlowTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  def create_uploaded_document(checksum: SecureRandom.hex, file_kind: "pdf", storage_path: "/tmp/fake.pdf")
    company = Company.first || Company.create!(name: "TestCo")
    u       = User.create!(email: "#{SecureRandom.hex(4)}@flow.test",
                           name: "Flow", username: SecureRandom.hex(4))
    emp     = Employee.create!(user: u, company: company)
    UploadedDocument.create!(
      original_filename: "source.#{file_kind}",
      storage_path:      storage_path,
      page_count:        1,
      checksum:          checksum,
      file_kind:         file_kind,
      employee:          emp
    )
  end

  def create_extracted_document(uploaded_document:, **attrs)
    uploaded_document.extracted_documents.create!(
      { sequence: 1, page_start: 1, page_end: 1, status: "queued" }.merge(attrs)
    )
  end

  # ---------------------------------------------------------------------------
  # GET /documents/uploads
  # ---------------------------------------------------------------------------

  test "uploads returns list with file_kind" do
    create_uploaded_document(file_kind: "image", checksum: "flow-uploads-1")

    get uploaded_documents_path

    assert_response :success
    body  = JSON.parse(response.body)
    kinds = body["uploaded_documents"].map { |d| d["file_kind"] }
    assert_includes kinds, "image"
  end

  # ---------------------------------------------------------------------------
  # GET /documents/uploads/:id/file  — download of existing CSV
  # ---------------------------------------------------------------------------

  test "uploaded_file downloads original csv source" do
    temp = Tempfile.new(["source", ".csv"])
    temp.write("recipient,amount\nMario,10\n")
    temp.rewind

    ud = create_uploaded_document(checksum: "flow-csv-dl-1", file_kind: "csv",
                                   storage_path: temp.path)

    get uploaded_document_file_path(id: ud.id)

    assert_response :success
    assert_equal "text/csv", response.media_type
    assert_includes response.headers["Content-Disposition"], "source.csv"
  ensure
    temp&.close!
  end

  test "uploaded_file returns not_found for missing document" do
    get uploaded_document_file_path(id: 0)
    assert_response :not_found
  end

  # ---------------------------------------------------------------------------
  # GET /documents/extracted/:id/pdf  — bad request when source PDF missing
  # ---------------------------------------------------------------------------

  test "extracted_pdf returns bad_request when source pdf does not exist" do
    ud = create_uploaded_document(checksum: "flow-pdf-miss-1",
                                   storage_path: "/tmp/this_file_does_not_exist_ever.pdf")
    ed = create_extracted_document(uploaded_document: ud)

    get extracted_pdf_document_path(id: ed.id)

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error",                        body["status"]
    assert_equal "PDF sorgente non disponibile", body["message"]
  end

  # ---------------------------------------------------------------------------
  # GET /documents/uploads/:uploaded_document_id/extracted
  # ---------------------------------------------------------------------------

  test "extracted_index returns extracted documents for an upload" do
    ud = create_uploaded_document(checksum: "flow-extracted-list-1")
    create_extracted_document(uploaded_document: ud, status: "done")

    get uploaded_document_extracted_documents_path(uploaded_document_id: ud.id)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1,      body["extracted_documents"].size
    assert_equal "done", body["extracted_documents"].first["status"]
  end

  # ---------------------------------------------------------------------------
  # GET /documents/extracted/:id
  # ---------------------------------------------------------------------------

  test "extracted_show returns a single extracted document" do
    ud = create_uploaded_document(checksum: "flow-show-1")
    ed = create_extracted_document(uploaded_document: ud, status: "done")

    get extracted_document_path(id: ed.id)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal ed.id,  body["extracted_document"]["id"]
    assert_equal "done", body["extracted_document"]["status"]
  end

  test "extracted_show returns not_found for missing id" do
    get extracted_document_path(id: 0)
    assert_response :not_found
  end

  # ---------------------------------------------------------------------------
  # PATCH /documents/extracted/:id/validate
  # ---------------------------------------------------------------------------

  test "validate_extracted marks document as validated" do
    ud = create_uploaded_document(checksum: "flow-validate-1")
    ed = create_extracted_document(uploaded_document: ud, status: "done")

    patch validate_extracted_document_path(id: ed.id)

    assert_response :success
    ed.reload
    assert_equal "validated", ed.status
  end
end
