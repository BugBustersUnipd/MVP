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

  test "update_extracted_metadata merges metadata and sets confidence to 100 for updated keys" do
    # Clear any residual data from previous tests - delete in correct FK order
    Sending.delete_all
    ProcessingItem.delete_all
    ExtractedDocument.delete_all
    ProcessingRun.delete_all
    UploadedDocument.delete_all
    Employee.delete_all

    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "mario@test.it", name: "Mario Rossi", username: "mario_dbm")
    employee = Employee.create!(user: u, company: company)
    uploaded = UploadedDocument.create!(original_filename: "u.pdf", storage_path: "/tmp/u", page_count: 1, checksum: "dbm-3", file_kind: "pdf", employee: employee)
    extracted = ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1,
      page_start: 1,
      page_end: 1,
      metadata: { "company" => "Old" },
      confidence: { "company" => 20 }
    )

    manager = DocumentProcessing::Persistence::DbManager.new(
      data_item_repository: DocumentProcessing::Persistence::DataItemRepository.new,
      recipient_resolver: FakeRecipientResolver.new(u)
    )

    result = manager.update_extracted_metadata(
      extracted_document_id: extracted.id,
      metadata_updates: { "company" => "New Co", "recipient" => "Mario Rossi" }
    )

    assert_equal "New Co", result.metadata["company"]
    assert_equal 100, result.confidence["company"]
    assert_equal "Mario Rossi", result.recipient
    assert_equal u.id, result.matched_employee_id
  ensure
    Sending.delete_all
    ProcessingItem.delete_all
    ExtractedDocument.delete_all
    ProcessingRun.delete_all
    UploadedDocument.delete_all
    Employee.delete_all
  end
end
