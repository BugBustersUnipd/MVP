require "test_helper"

class DocumentProcessing::Sendings::CreateSendingTest < ActiveSupport::TestCase
  test "creates sending successfully with subject" do
    company = Company.first || Company.create!(name: "TestCo")
      user = User.create!(email: "mario@x.it", name: "Mario", username: "mario")
      recipient_employee = Employee.create!(user: user, company: company)
      ud = UploadedDocument.create!(original_filename: "a.pdf", storage_path: "/tmp/a", page_count: 1, checksum: "ch20", file_kind: "pdf", employee: recipient_employee)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
        recipient_id: user.id,
      sent_at: Time.current,
      subject: "Test Subject"
    ).call

    assert result.success?
    assert_equal "Test Subject", result.result[:sending].subject
  end

  test "creates sending successfully with custom body" do
    company = Company.first || Company.create!(name: "TestCo")
      user = User.create!(email: "mario-body@x.it", name: "Mario", username: "mariobody")
      recipient_employee = Employee.create!(user: user, company: company)
      ud = UploadedDocument.create!(original_filename: "ab.pdf", storage_path: "/tmp/ab", page_count: 1, checksum: "ch20b", file_kind: "pdf", employee: recipient_employee)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
        recipient_id: user.id,
      sent_at: Time.current,
      subject: "Test Subject",
      body: "Testo custom inviato manualmente"
    ).call

    assert result.success?
    assert_equal "Testo custom inviato manualmente", result.result[:sending].body
  end

  test "creates sending and inherits subject from template" do
    company = Company.first || Company.create!(name: "TestCo")
      user = User.create!(email: "mario@x.it", name: "Mario", username: "mario2")
      recipient_employee = Employee.create!(user: user, company: company)
      ud = UploadedDocument.create!(original_filename: "b.pdf", storage_path: "/tmp/b", page_count: 1, checksum: "ch21", file_kind: "pdf", employee: recipient_employee)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)
    template = Template.create!(subject: "Template Subject", body: "Template body")

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
        recipient_id: user.id,
      sent_at: Time.current,
      template_id: template.id
    ).call

    assert result.success?
    assert_equal "Template Subject", result.result[:sending].subject
    assert_equal "Template body", result.result[:sending].body
  end

  test "fails with missing extracted_document_id" do
    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: nil,
      recipient_id: 1,
      sent_at: Time.current
    ).call

    assert !result.success?
    assert result.result[:error].include?("obbligatori")
  end

  test "fails with missing recipient_id" do
    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: 1,
      recipient_id: nil,
      sent_at: Time.current
    ).call

    assert !result.success?
    assert result.result[:error].include?("obbligatori")
  end

  test "prefers explicit subject over template subject" do
    company = Company.first || Company.create!(name: "TestCo")
      user = User.create!(email: "luigi@x.it", name: "Luigi", username: "luigi")
      recipient_employee = Employee.create!(user: user, company: company)
      ud = UploadedDocument.create!(original_filename: "c.pdf", storage_path: "/tmp/c", page_count: 1, checksum: "ch22", file_kind: "pdf", employee: recipient_employee)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)
    template = Template.create!(subject: "Template Subject", body: "Body")

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
        recipient_id: user.id,
      sent_at: Time.current,
      subject: "Explicit Subject",
      template_id: template.id
    ).call

    assert result.success?
    assert_equal "Explicit Subject", result.result[:sending].subject
  end

  test "explicit body is kept when template is used" do
    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(email: "sara#{SecureRandom.hex(3)}@x.it", name: "Sara", username: "sara#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: user, company: company)
    ud = UploadedDocument.create!(original_filename: "d.pdf", storage_path: "/tmp/d", page_count: 1, checksum: "ch-sara-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)
    template = Template.create!(subject: "Tpl Subject", body: "Template Body")

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
      recipient_id: user.id,
      sent_at: Time.current,
      body: "Corpo esplicito",
      template_id: template.id
    ).call

    assert result.success?
    # Subject inherited from template (not passed), body kept from params
    assert_equal "Tpl Subject", result.result[:sending].subject
    assert_equal "Corpo esplicito", result.result[:sending].body
  end

  test "sending without template_id and without subject succeeds with nil subject" do
    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(email: "notpl#{SecureRandom.hex(3)}@x.it", name: "NoTpl", username: "notpl#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: user, company: company)
    ud = UploadedDocument.create!(original_filename: "e.pdf", storage_path: "/tmp/e", page_count: 1, checksum: "ch-notpl-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1)

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
      recipient_id: user.id,
      sent_at: Time.current
    ).call

    assert result.success?
    assert_nil result.result[:sending].subject
  end

  test "marks extracted_document as sent after success" do
    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(email: "sent#{SecureRandom.hex(3)}@x.it", name: "Sent", username: "sentuser#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: user, company: company)
    ud = UploadedDocument.create!(original_filename: "f.pdf", storage_path: "/tmp/f", page_count: 1, checksum: "ch-sent-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, status: "done")

    result = DocumentProcessing::Sendings::CreateSending.new(
      extracted_document_id: ed.id,
      recipient_id: user.id,
      sent_at: Time.current
    ).call

    assert result.success?
    assert_equal "sent", ed.reload.status
  end
end
