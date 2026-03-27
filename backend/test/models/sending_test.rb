require "test_helper"

class SendingTest < ActiveSupport::TestCase
  def setup_deps
    company = Company.first || Company.create!(name: "TestCo")
    @user   = User.create!(email: "snd#{SecureRandom.hex(4)}@test.com",
                           name: "Sender", username: "snd#{SecureRandom.hex(4)}")
    emp     = Employee.create!(user: @user, company: company)
    ud      = UploadedDocument.create!(
      original_filename: "doc.pdf",
      storage_path:      "/tmp/doc.pdf",
      checksum:          SecureRandom.hex,
      file_kind:         "pdf",
      employee:          emp
    )
    @ed = ud.extracted_documents.create!(sequence: 1, page_start: 1, page_end: 1)
  end

  def valid_sending(overrides = {})
    setup_deps unless @user
    Sending.new(
      {
        recipient:          @user,
        extracted_document: @ed,
        sent_at:            Time.current,
        subject:            "Test",
        body:               "Test body"
      }.merge(overrides)
    )
  end

  test "valid sending saves successfully" do
    assert valid_sending.valid?
  end

  test "requires recipient" do
    s = valid_sending(recipient: nil)
    assert_not s.valid?
    assert s.errors[:recipient].any?
  end

  test "requires extracted_document" do
    s = valid_sending(extracted_document: nil)
    assert_not s.valid?
    assert s.errors[:extracted_document].any?
  end

  test "requires sent_at" do
    s = valid_sending(sent_at: nil)
    assert_not s.valid?
    assert_includes s.errors[:sent_at], "can't be blank"
  end

  test "subject can be blank" do
    assert valid_sending(subject: nil).valid?
    assert valid_sending(subject: "").valid?
  end

  test "subject max length is 255" do
    assert_not valid_sending(subject: "x" * 256).valid?
    assert     valid_sending(subject: "x" * 255).valid?
  end

  test "body can be blank" do
    assert valid_sending(body: nil).valid?
  end

  test "body max length is 10000" do
    assert_not valid_sending(body: "x" * 10_001).valid?
    assert     valid_sending(body: "x" * 10_000).valid?
  end

  test "template is optional" do
    assert valid_sending(template: nil).valid?
  end
end
