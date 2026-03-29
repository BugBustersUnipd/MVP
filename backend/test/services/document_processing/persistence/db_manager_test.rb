require "test_helper"

class DocumentProcessing::Persistence::DbManagerTest < ActiveSupport::TestCase
  class FakeResolution
    attr_reader :employee

    def initialize(employee)
      @employee = employee
    end

    def matched?
      true
    end
  end

  class FakeRecipientResolver
    def initialize(employee)
      @employee = employee
    end

    def resolve(recipient_names:, raw_text:)
      FakeResolution.new(@employee)
    end
  end

  test "uploaded_documents_list returns minimal payload" do
    company = Company.first || Company.create!(name: "TestCo")
    u1 = User.create!(email: "u1@test", name: "U1", username: "u1")
    e1 = Employee.create!(user: u1, company: company)
    u2 = User.create!(email: "u2@test", name: "U2", username: "u2")
    e2 = Employee.create!(user: u2, company: company)

    UploadedDocument.create!(original_filename: "a.pdf", storage_path: "/tmp/a", page_count: 1, checksum: "dbm-1", file_kind: "pdf", employee: e1)
    UploadedDocument.create!(original_filename: "b.csv", storage_path: "/tmp/b", page_count: 1, checksum: "dbm-2", file_kind: "csv", employee: e2)

    manager = DocumentProcessing::Persistence::DbManager.new(
      data_item_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      recipient_resolver: nil
    )
    list = manager.uploaded_documents_list

    filenames = list.map { |row| row[:original_filename] }

    assert_includes filenames, "a.pdf"
    assert_includes filenames, "b.csv"
    assert list.first.key?(:id)
    assert list.first.key?(:file_kind)
  end

  def build_manager(user)
    DocumentProcessing::Persistence::DbManager.new(
      data_item_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      recipient_resolver: FakeRecipientResolver.new(user)
    )
  end

  def build_extracted(employee, checksum:, metadata: {})
    ud = UploadedDocument.create!(original_filename: "u.pdf", storage_path: "/tmp/u",
                                   page_count: 1, checksum: checksum, file_kind: "pdf", employee: employee)
    ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1,
                               metadata: metadata, confidence: {})
  end

  test "update_extracted_metadata merges metadata and sets confidence to 1.0 for updated keys" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "mario#{SecureRandom.hex(3)}@test.it", name: "Mario Rossi", username: "mario_dbm#{SecureRandom.hex(3)}")
    employee = Employee.create!(user: u, company: company)
    extracted = build_extracted(employee, checksum: "dbm-3-#{SecureRandom.hex(4)}", metadata: { "company" => "Old" })

    result = build_manager(u).update_extracted_metadata(
      extracted_document_id: extracted.id,
      metadata_updates: { "company" => "New Co", "recipient" => "Mario Rossi" }
    )

    assert_equal "New Co", result.metadata["company"]
    assert_equal 1.0, result.confidence["company"]
    assert_equal "Mario Rossi", result.recipient
    assert_equal u.id, result.matched_employee_id
  end

  test "update_extracted_metadata with raw_recipient uses it as recipient" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "raw#{SecureRandom.hex(3)}@test.it", name: "Raw User", username: "rawuser#{SecureRandom.hex(3)}")
    employee = Employee.create!(user: u, company: company)
    extracted = build_extracted(employee, checksum: "dbm-raw-#{SecureRandom.hex(4)}")

    result = build_manager(u).update_extracted_metadata(
      extracted_document_id: extracted.id,
      metadata_updates: { "raw_recipient" => "Raw User Name" }
    )

    assert_equal "Raw User Name", result.recipient
  end

  test "update_extracted_metadata with recipients array uses first element" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "arr#{SecureRandom.hex(3)}@test.it", name: "Array User", username: "arrayuser#{SecureRandom.hex(3)}")
    employee = Employee.create!(user: u, company: company)
    extracted = build_extracted(employee, checksum: "dbm-arr-#{SecureRandom.hex(4)}")

    result = build_manager(u).update_extracted_metadata(
      extracted_document_id: extracted.id,
      metadata_updates: { "recipients" => ["First User", "Second User"] }
    )

    assert_equal "First User", result.recipient
  end

  test "update_extracted_metadata with no recipient fields uses existing recipient" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "existing#{SecureRandom.hex(3)}@test.it", name: "Existing", username: "existing#{SecureRandom.hex(3)}")
    employee = Employee.create!(user: u, company: company)
    ud = UploadedDocument.create!(original_filename: "u.pdf", storage_path: "/tmp/u",
                                   page_count: 1, checksum: "dbm-norecip-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: employee)
    extracted = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1,
                                          metadata: {}, confidence: {}, recipient: "Original Recipient")

    result = build_manager(u).update_extracted_metadata(
      extracted_document_id: extracted.id,
      metadata_updates: { "company" => "Some Co" }
    )

    assert_equal "Original Recipient", result.recipient
  end

  test "update_extracted_metadata raises ArgumentError for non-hash updates" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "err#{SecureRandom.hex(3)}@test.it", name: "Err", username: "erruser#{SecureRandom.hex(3)}")
    employee = Employee.create!(user: u, company: company)
    extracted = build_extracted(employee, checksum: "dbm-err-#{SecureRandom.hex(4)}")
    manager = build_manager(u)

    assert_raises(ArgumentError) { manager.update_extracted_metadata(extracted_document_id: extracted.id, metadata_updates: "not-a-hash") }
  end

  test "update_extracted_metadata raises RecordNotFound for missing id" do
    manager = build_manager(nil)
    assert_raises(ActiveRecord::RecordNotFound) { manager.update_extracted_metadata(extracted_document_id: 0, metadata_updates: {}) }
  end
end
