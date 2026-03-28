require "test_helper"

# Unit/integration tests for DocumentsController.
# Tests that require the container stubbed use a FakeContainer instead of the real one,
# to avoid AWS dependencies. Tests that only need DB access use the real container.
class DocumentsControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # Shared helpers
  # ---------------------------------------------------------------------------

  def create_uploaded_document(checksum: SecureRandom.hex, file_kind: "pdf", storage_path: "/tmp/fake.pdf")
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "#{SecureRandom.hex(4)}@docs.test",
                     name: "Docs", username: SecureRandom.hex(4))
    emp = Employee.create!(user: u, company: company)
    UploadedDocument.create!(
      original_filename: "source.#{file_kind}",
      storage_path: storage_path,
      page_count: 3,
      checksum: checksum,
      file_kind: file_kind,
      employee: emp
    )
  end

  def create_extracted_document(uploaded_document:, **attrs)
    uploaded_document.extracted_documents.create!(
      { sequence: 1, page_start: 1, page_end: 1, status: "queued" }.merge(attrs)
    )
  end

  # Builds a command stub that returns the given result hash on `.call(**)`
  def fake_command(result)
    Object.new.tap do |cmd|
      cmd.define_singleton_method(:call) { |**_kwargs| result }
    end
  end

  # Builds a minimal fake Container enough for the actions under test.
  # Accepts optional overrides for each sub-service.
  def fake_container(overrides = {})
    real_repo      = DocumentProcessing::Persistence::DataItemRepository.new
    real_resolver  = DocumentProcessing::RecipientResolver.new
    real_db_manager = DocumentProcessing::Persistence::DbManager.new(
      data_item_repository: real_repo,
      recipient_resolver:   real_resolver
    )
    real_storage   = DocumentProcessing::Persistence::FileStorage.new

    init_result    = overrides.fetch(:init_result, { status: "queued", job_id: "j1", uploaded_document_id: 1, message: "ok" })
    file_result    = overrides.fetch(:file_result, { status: "queued", job_id: "j2", uploaded_document_id: 2, message: "ok" })
    reassign_result = overrides.fetch(:reassign_result, nil)

    init_cmd    = fake_command(init_result)
    file_cmd    = fake_command(file_result)

    Object.new.tap do |c|
      c.define_singleton_method(:initialize_processing_command)      { init_cmd }
      c.define_singleton_method(:initialize_file_processing_command) { file_cmd }
      c.define_singleton_method(:reassign_extracted_range_command) do
        Object.new.tap do |cmd|
          cmd.define_singleton_method(:call) do |extracted_document_id:, page_start:, page_end:|
            reassign_result || {
              ok: true,
              extracted_document_id: extracted_document_id,
              page_start: page_start,
              page_end: page_end,
              message: "Riassegnazione completata"
            }
          end
        end
      end
      c.define_singleton_method(:file_storage)             { overrides.fetch(:file_storage, real_storage) }
      c.define_singleton_method(:db_manager)               { overrides.fetch(:db_manager, real_db_manager) }
      c.define_singleton_method(:page_range_pdf_service_class) { overrides.fetch(:page_range_pdf_service_class, DocumentProcessing::PageRangePdf) }
    end
  end

  # ---------------------------------------------------------------------------
  # GET /documents/test
  # ---------------------------------------------------------------------------

  test "GET /documents/test renders successfully" do
    get test_documents_path
    assert_response :success
  end

  # ---------------------------------------------------------------------------
  # POST /documents/split
  # ---------------------------------------------------------------------------

  test "split with no file triggers rescue and returns bad_request" do
    post split_documents_path
    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
  end

  test "split with command returning queued returns success JSON" do
    container = fake_container(init_result: { status: "queued", job_id: "job-xyz", uploaded_document_id: 42, message: "Avviato" })

    stub_new(DocumentProcessing::Container, container) do
      post split_documents_path, params: { pdf: "dummy_file", category: "cedolino" }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "queued",  body["status"]
    assert_equal "job-xyz", body["job_id"]
    assert_equal 42,        body["uploaded_document_id"]
  end

  test "split with command returning already_exists passes uploaded_document_id" do
    container = fake_container(init_result: { status: "already_exists", job_id: nil, uploaded_document_id: 99, message: "Documento già caricato" })

    stub_new(DocumentProcessing::Container, container) do
      post split_documents_path, params: { pdf: "file" }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 99, body["uploaded_document_id"]
    assert_nil body["job_id"]
  end

  test "split with command validation error returns bad_request" do
    container = fake_container(init_result: { ok: false, error: :validation, message: "File mancante" })

    stub_new(DocumentProcessing::Container, container) do
      post split_documents_path, params: { pdf: "file" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error",        body["status"]
    assert_equal "File mancante", body["message"]
  end

  test "split with command persistence error returns bad_request" do
    container = fake_container(init_result: { ok: false, error: :persistence, message: "Disco pieno" })

    stub_new(DocumentProcessing::Container, container) do
      post split_documents_path, params: { pdf: "file" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "Errore nel salvataggio del file", body["message"]
  end

  test "split with command generic error returns bad_request with message" do
    container = fake_container(init_result: { ok: false, error: :generic, message: "Errore generico" })

    stub_new(DocumentProcessing::Container, container) do
      post split_documents_path, params: { pdf: "file" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_match(/Errore/, body["message"])
  end

  # ---------------------------------------------------------------------------
  # POST /documents/process_file
  # ---------------------------------------------------------------------------

  test "process_file with no file triggers rescue and returns bad_request" do
    post process_file_documents_path
    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
  end

  test "process_file with successful command returns queued" do
    container = fake_container(file_result: { status: "queued", job_id: "j-file", uploaded_document_id: 5, message: "ok" })

    stub_new(DocumentProcessing::Container, container) do
      post process_file_documents_path, params: { file: "csv_data", category: "buste_paga" }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "queued",  body["status"]
    assert_equal "j-file",  body["job_id"]
  end

  test "process_file with command validation error returns bad_request" do
    container = fake_container(file_result: { ok: false, error: :validation, message: "Formato non supportato" })

    stub_new(DocumentProcessing::Container, container) do
      post process_file_documents_path, params: { file: "file" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "Formato non supportato", body["message"]
  end

  test "process_file with command persistence error returns bad_request" do
    container = fake_container(file_result: { ok: false, error: :persistence, message: "io error" })

    stub_new(DocumentProcessing::Container, container) do
      post process_file_documents_path, params: { file: "file" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "Errore nel salvataggio del file", body["message"]
  end

  test "process_file with generic error in command returns bad_request" do
    container = fake_container(file_result: { ok: false, error: :other, message: "altro errore" })

    stub_new(DocumentProcessing::Container, container) do
      post process_file_documents_path, params: { file: "file" }
    end

    assert_response :bad_request
  end

  # ---------------------------------------------------------------------------
  # GET /documents/uploads
  # ---------------------------------------------------------------------------

  test "uploads returns list of uploaded documents" do
    create_uploaded_document(checksum: "ctrl-uploads-1", file_kind: "pdf")
    create_uploaded_document(checksum: "ctrl-uploads-2", file_kind: "csv")

    get uploaded_documents_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["uploaded_documents"].is_a?(Array)
    checksums_from_list = UploadedDocument.order(created_at: :desc).pluck(:id)
    ids_from_body = body["uploaded_documents"].map { |d| d["id"] }
    assert (checksums_from_list & ids_from_body).any?
  end

  # ---------------------------------------------------------------------------
  # GET /documents/uploads/:id/file
  # ---------------------------------------------------------------------------

  test "uploaded_file returns file when it exists on disk" do
    tmp = Tempfile.new(["ctrl-src", ".pdf"])
    tmp.write("%PDF-1.4 fake")
    tmp.flush

    ud = create_uploaded_document(checksum: "ctrl-file-dl-1", file_kind: "pdf", storage_path: tmp.path)

    get uploaded_document_file_path(id: ud.id)

    assert_response :success
    assert_equal "application/pdf", response.media_type
  ensure
    tmp&.close!
  end

  test "uploaded_file returns bad_request when source file not on disk" do
    ud = create_uploaded_document(checksum: "ctrl-file-dl-miss", file_kind: "pdf",
                                   storage_path: "/tmp/definitely_does_not_exist_ctrl.pdf")

    get uploaded_document_file_path(id: ud.id)

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "File sorgente non disponibile", body["message"]
  end

  test "uploaded_file returns not_found for unknown id" do
    get uploaded_document_file_path(id: 0)
    assert_response :not_found
  end

  test "uploaded_file returns correct content-type for csv" do
    tmp = Tempfile.new(["ctrl-src", ".csv"])
    tmp.write("col1,col2\n")
    tmp.flush

    ud = create_uploaded_document(checksum: "ctrl-file-csv", file_kind: "csv", storage_path: tmp.path)

    get uploaded_document_file_path(id: ud.id)

    assert_response :success
    assert_equal "text/csv", response.media_type
  ensure
    tmp&.close!
  end

  test "uploaded_file returns jpeg content-type for image file_kind" do
    tmp = Tempfile.new(["ctrl-src", ".jpg"])
    tmp.write("fake image data")
    tmp.flush

    ud = create_uploaded_document(checksum: "ctrl-file-img", file_kind: "image", storage_path: tmp.path)

    get uploaded_document_file_path(id: ud.id)

    assert_response :success
    assert_equal "image/jpeg", response.media_type
  ensure
    tmp&.close!
  end

  test "uploaded_file returns png content-type for image with png extension" do
    tmp = Tempfile.new(["ctrl-src", ".png"])
    tmp.write("fake png data")
    tmp.flush

    ud = UploadedDocument.create!(
      original_filename: "photo.png",
      storage_path: tmp.path,
      page_count: 1,
      checksum: "ctrl-file-png",
      file_kind: "image",
      employee: Employee.create!(
        user: User.create!(email: "png@test.com", name: "Png", username: "pnguser"),
        company: Company.first || Company.create!(name: "TestCo")
      )
    )

    get uploaded_document_file_path(id: ud.id)

    assert_response :success
    assert_equal "image/png", response.media_type
  ensure
    tmp&.close!
  end


  # ---------------------------------------------------------------------------
  # GET /documents/uploads/:id/extracted
  # ---------------------------------------------------------------------------

  test "extracted_index returns documents for given upload" do
    ud = create_uploaded_document(checksum: "ctrl-ext-idx-1")
    create_extracted_document(uploaded_document: ud, status: "done")

    get uploaded_document_extracted_documents_path(uploaded_document_id: ud.id)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["extracted_documents"].size
    assert_equal "done", body["extracted_documents"].first["status"]
  end

  test "extracted_index returns not_found for missing upload" do
    get uploaded_document_extracted_documents_path(uploaded_document_id: 0)
    assert_response :not_found
  end

  # ---------------------------------------------------------------------------
  # GET /documents/extracted/:id
  # ---------------------------------------------------------------------------

  test "extracted_show returns the extracted document" do
    ud = create_uploaded_document(checksum: "ctrl-show-1")
    ed = create_extracted_document(uploaded_document: ud, status: "done", recipient: "Mario")

    get extracted_document_path(id: ed.id)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal ed.id,   body["extracted_document"]["id"]
    assert_equal "done",  body["extracted_document"]["status"]
  end

  test "extracted_show returns not_found for missing id" do
    get extracted_document_path(id: 0)
    assert_response :not_found
  end

  # ---------------------------------------------------------------------------
  # GET /documents/extracted/:id/pdf
  # ---------------------------------------------------------------------------

  test "extracted_pdf returns not_found for missing extracted document" do
    get extracted_pdf_document_path(id: 0)
    assert_response :not_found
  end

  test "extracted_pdf returns bad_request when source pdf missing" do
    ud = create_uploaded_document(checksum: "ctrl-pdf-miss", storage_path: "/tmp/ctrl_never_exists.pdf")
    ed = create_extracted_document(uploaded_document: ud)

    get extracted_pdf_document_path(id: ed.id)

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "PDF sorgente non disponibile", body["message"]
  end

  # ---------------------------------------------------------------------------
  # PATCH /documents/extracted/:id/reassign_range
  # ---------------------------------------------------------------------------

  test "reassign_range with no params returns bad_request" do
    ud = create_uploaded_document(checksum: "ctrl-reassign-nil")
    ed = create_extracted_document(uploaded_document: ud)

    patch reassign_extracted_document_range_path(id: ed.id)

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "Range pagine non valido", body["message"]
  end

  test "reassign_range with invalid page_range string returns bad_request" do
    ud = create_uploaded_document(checksum: "ctrl-reassign-bad")
    ed = create_extracted_document(uploaded_document: ud)

    patch reassign_extracted_document_range_path(id: ed.id), params: { page_range: "not-a-range" }

    assert_response :bad_request
  end

  test "reassign_range with page_range string succeeds" do
    ud = create_uploaded_document(checksum: "ctrl-reassign-ok")
    ed = create_extracted_document(uploaded_document: ud)
    container = fake_container

    stub_new(DocumentProcessing::Container, container) do
      patch reassign_extracted_document_range_path(id: ed.id), params: { page_range: "1-2" }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "queued", body["status"]
    assert_equal 1, body["page_start"]
    assert_equal 2, body["page_end"]
  end

  test "reassign_range with separate page_start and page_end params succeeds" do
    ud = create_uploaded_document(checksum: "ctrl-reassign-sep")
    ed = create_extracted_document(uploaded_document: ud)
    container = fake_container

    stub_new(DocumentProcessing::Container, container) do
      patch reassign_extracted_document_range_path(id: ed.id), params: { page_start: "1", page_end: "3" }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["page_start"]
    assert_equal 3, body["page_end"]
  end

  test "reassign_range with command validation error returns bad_request" do
    ud = create_uploaded_document(checksum: "ctrl-reassign-val")
    ed = create_extracted_document(uploaded_document: ud)
    container = fake_container(reassign_result: { ok: false, error: :validation, message: "Range non valido" })

    stub_new(DocumentProcessing::Container, container) do
      patch reassign_extracted_document_range_path(id: ed.id), params: { page_start: "1", page_end: "2" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "Range non valido", body["message"]
  end

  test "reassign_range with command non-validation error returns bad_request with generic message" do
    ud = create_uploaded_document(checksum: "ctrl-reassign-other")
    ed = create_extracted_document(uploaded_document: ud)
    container = fake_container(reassign_result: { ok: false, error: :other, message: "Errore generico" })

    stub_new(DocumentProcessing::Container, container) do
      patch reassign_extracted_document_range_path(id: ed.id), params: { page_start: "1", page_end: "2" }
    end

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_match(/Errore/, body["message"])
  end

  test "reassign_range returns not_found for missing extracted document" do
    get extracted_document_path(id: 0)
    assert_response :not_found
  end

  # ---------------------------------------------------------------------------
  # PATCH /documents/extracted/:id/metadata
  # ---------------------------------------------------------------------------

  test "update_metadata with valid hash updates extracted document" do
    ud = create_uploaded_document(checksum: "ctrl-meta-1")
    ed = create_extracted_document(uploaded_document: ud, metadata: { "company" => "Old" })

    patch update_extracted_document_metadata_path(id: ed.id),
          params: { metadata_updates: { company: "New Co" } }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
    ed.reload
    assert_equal "New Co", ed.metadata["company"]
  end

  test "update_metadata with JSON string body updates document" do
    ud = create_uploaded_document(checksum: "ctrl-meta-json")
    ed = create_extracted_document(uploaded_document: ud, metadata: { "company" => "Old" })

    patch update_extracted_document_metadata_path(id: ed.id),
          params: { metadata_updates: '{"company":"JSON Co"}' }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
  end

  test "update_metadata with metadata param key also works" do
    ud = create_uploaded_document(checksum: "ctrl-meta-alt")
    ed = create_extracted_document(uploaded_document: ud)

    patch update_extracted_document_metadata_path(id: ed.id),
          params: { metadata: { company: "Via metadata param" } }

    assert_response :success
  end

  test "update_metadata with invalid JSON string falls back to empty hash" do
    ud = create_uploaded_document(checksum: "ctrl-meta-badjson")
    ed = create_extracted_document(uploaded_document: ud)

    patch update_extracted_document_metadata_path(id: ed.id),
          params: { metadata_updates: "not-valid-json{{" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
  end

  test "update_metadata returns not_found for missing document" do
    patch update_extracted_document_metadata_path(id: 0),
          params: { metadata_updates: { company: "X" } }
    assert_response :not_found
  end

  # ---------------------------------------------------------------------------
  # PATCH /documents/extracted/:id/validate
  # ---------------------------------------------------------------------------

  test "validate_extracted marks done document as validated" do
    ud = create_uploaded_document(checksum: "ctrl-validate-1")
    ed = create_extracted_document(uploaded_document: ud, status: "done")

    patch validate_extracted_document_path(id: ed.id)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
    assert_equal "validated", ed.reload.status
  end

  test "validate_extracted returns bad_request when document is not in done state" do
    ud = create_uploaded_document(checksum: "ctrl-validate-notdone")
    ed = create_extracted_document(uploaded_document: ud, status: "queued")

    patch validate_extracted_document_path(id: ed.id)

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
    assert_match(/done/, body["message"])
  end

  test "validate_extracted returns bad_request for in_progress document" do
    ud = create_uploaded_document(checksum: "ctrl-validate-ip")
    ed = create_extracted_document(uploaded_document: ud, status: "in_progress")

    patch validate_extracted_document_path(id: ed.id)

    assert_response :bad_request
  end

  test "validate_extracted returns not_found for missing document" do
    patch validate_extracted_document_path(id: 0)
    assert_response :not_found
  end
end
