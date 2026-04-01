require "test_helper"

class UploadedDocumentTest < ActiveSupport::TestCase
  # Verifica le condizioni richieste prima di procedere.
  def valid_doc(overrides = {})
    company = Company.first || Company.create!(name: "TestCo")
    user    = User.create!(email: "ud#{SecureRandom.hex(4)}@test.com",
                           name: "UD User", username: "ud#{SecureRandom.hex(4)}")
    emp     = Employee.create!(user: user, company: company)

    UploadedDocument.new(
      {
        original_filename: "test.pdf",
        storage_path:      "/tmp/test.pdf",
        checksum:          SecureRandom.hex,
        file_kind:         "pdf",
        page_count:        1,
        employee:          emp
      }.merge(overrides)
    )
  end

  test "valid document saves successfully" do
    assert valid_doc.valid?
  end

  test "requires original_filename" do
    doc = valid_doc(original_filename: nil)
    assert_not doc.valid?
    assert_includes doc.errors[:original_filename], "can't be blank"
  end

  test "requires storage_path" do
    doc = valid_doc(storage_path: nil)
    assert_not doc.valid?
    assert_includes doc.errors[:storage_path], "can't be blank"
  end

  test "requires checksum" do
    doc = valid_doc(checksum: nil)
    assert_not doc.valid?
    assert_includes doc.errors[:checksum], "can't be blank"
  end

  test "checksum must be unique" do
    fixed_checksum = "unique-chk-#{SecureRandom.hex(4)}"
    valid_doc(checksum: fixed_checksum).save!

    duplicate = valid_doc(checksum: fixed_checksum)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:checksum], "has already been taken"
  end

  test "file_kind must be pdf csv or image" do
    %w[pdf csv image].each do |kind|
      assert valid_doc(file_kind: kind).valid?, "expected #{kind} to be valid"
    end

    doc = valid_doc(file_kind: "docx")
    assert_not doc.valid?
    assert_includes doc.errors[:file_kind], "is not included in the list"
  end

  test "file_kind can be nil" do
    assert valid_doc(file_kind: nil).valid?
  end

  test "page_count must be >= 0" do
    assert_not valid_doc(page_count: -1).valid?
    assert     valid_doc(page_count: 0).valid?
    assert     valid_doc(page_count: 10).valid?
  end

  test "page_count can be nil" do
    assert valid_doc(page_count: nil).valid?
  end

  test "employee association is optional at model level" do
    doc = UploadedDocument.new(
      original_filename: "x.pdf",
      storage_path:      "/tmp/x.pdf",
      checksum:          SecureRandom.hex,
      file_kind:         "pdf"
    )
    assert doc.valid?
  end

  test "has_many extracted_documents destroyed with parent" do
    doc = valid_doc
    doc.save!
    doc.extracted_documents.create!(sequence: 1, page_start: 1, page_end: 1)

    assert_difference "ExtractedDocument.count", -1 do
      doc.destroy
    end
  end
end
