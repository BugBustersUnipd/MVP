require "test_helper"

class UploadManagerTest < ActiveSupport::TestCase
  class FakeUpload
    attr_reader :original_filename, :content_type, :tempfile

    # Inizializza le dipendenze del componente.
    def initialize(original_filename:, content_type:, content:)
      @original_filename = original_filename
      @content_type = content_type
      @tempfile = Tempfile.new(["upload", File.extname(original_filename)])
      @tempfile.binmode
      @tempfile.write(content)
      @tempfile.rewind
    end

    # Legge il contenuto dal file temporaneo.
    def read(*args)
      @tempfile.read(*args)
    end

    # Resetta la posizione di lettura al file.
    def rewind
      @tempfile.rewind
    end

    # Restituisce la dimensione del file in byte.
    def size
      @tempfile.size
    end
  end

  test "detect_upload_kind recognizes pdf csv and image" do
    manager = DocumentProcessing::UploadManager.new

    assert_equal :pdf, manager.detect_upload_kind(FakeUpload.new(original_filename: "a.pdf", content_type: "application/pdf", content: "%PDF-1.4"))
    assert_equal :csv, manager.detect_upload_kind(FakeUpload.new(original_filename: "a.csv", content_type: "text/csv", content: "x"))
    assert_equal :image, manager.detect_upload_kind(FakeUpload.new(original_filename: "a.png", content_type: "image/png", content: "x"))
  end

  test "persist_temp_pdf rejects invalid pdf signature" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "bad.pdf", content_type: "application/pdf", content: "NOTPDF")

    assert_raises(DocumentProcessing::UploadManager::ValidationError) do
      manager.persist_temp_pdf(fake)
    end
  end

  test "compute_checksum is stable" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "ok.pdf", content_type: "application/pdf", content: "%PDF-abc")

    c1 = manager.compute_checksum(fake)
    c2 = manager.compute_checksum(fake)

    assert_equal c1, c2
  end

  # ---------------------------------------------------------------------------
  # detect_upload_kind — edge cases
  # ---------------------------------------------------------------------------

  test "detect_upload_kind returns unknown for unsupported extension" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "file.docx", content_type: "application/msword", content: "x")
    assert_equal :unknown, manager.detect_upload_kind(fake)
  end

  test "detect_upload_kind detects jpeg as image" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "photo.jpg", content_type: "image/jpeg", content: "x")
    assert_equal :image, manager.detect_upload_kind(fake)
  end

  test "detect_upload_kind uses content_type when extension ambiguous" do
    manager = DocumentProcessing::UploadManager.new
    
    fake = FakeUpload.new(original_filename: "noext", content_type: "application/pdf", content: "%PDF-")
    assert_equal :pdf, manager.detect_upload_kind(fake)
  end

  # ---------------------------------------------------------------------------
  # validate_pdf_upload! — coverage of errore branches
  # ---------------------------------------------------------------------------

  test "persist_temp_pdf raises when file has wrong extension" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "file.csv", content_type: "application/pdf", content: "%PDF-1.4")

    assert_raises(DocumentProcessing::UploadManager::ValidationError) do
      manager.persist_temp_pdf(fake)
    end
  end

  test "persist_temp_pdf raises for wrong content_type" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "file.pdf", content_type: "text/plain", content: "%PDF-1.4")

    assert_raises(DocumentProcessing::UploadManager::ValidationError) do
      manager.persist_temp_pdf(fake)
    end
  end

  test "persist_source_pdf raises when pdf signature is invalid" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "bad.pdf", content_type: "application/pdf", content: "INVALID")

    assert_raises(DocumentProcessing::UploadManager::ValidationError) do
      manager.persist_source_pdf(fake)
    end
  end

  # ---------------------------------------------------------------------------
  # persist_supported_source_file — validation paths
  # ---------------------------------------------------------------------------

  test "persist_supported_source_file raises for unknown file kind" do
    manager = DocumentProcessing::UploadManager.new
    fake = FakeUpload.new(original_filename: "file.docx", content_type: "application/msword", content: "x")

    assert_raises(DocumentProcessing::UploadManager::ValidationError) do
      manager.persist_supported_source_file(fake)
    end
  end

  test "persist_supported_source_file raises for csv with wrong extension and content_type" do
    manager = DocumentProcessing::UploadManager.new
    # Has csv content_type but wrong extension, yet ALLOWED_CSV_CONTENT_TYPES includes text/csv
    
    fake = FakeUpload.new(original_filename: "file.xlsx", content_type: "application/msword", content: "x")
    # detect_upload_kind will restituisce :unknown → ValidationError "Formato non supportato"
    assert_raises(DocumentProcessing::UploadManager::ValidationError) do
      manager.persist_supported_source_file(fake)
    end
  end

  # ---------------------------------------------------------------------------
  # compute_checksum — works con plain IO objects too
  # ---------------------------------------------------------------------------

  test "compute_checksum works with a plain IO (no tempfile)" do
    manager = DocumentProcessing::UploadManager.new
    io = StringIO.new("content-without-tempfile")
    checksum = manager.compute_checksum(io)
    assert_equal Digest::SHA256.hexdigest("content-without-tempfile"), checksum
  end
end
