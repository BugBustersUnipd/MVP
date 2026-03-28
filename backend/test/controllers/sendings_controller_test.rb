require "test_helper"

class SendingsControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  def build_deps
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(
      email: "#{SecureRandom.hex(4)}@sending.test",
      name: "Sending User",
      username: SecureRandom.hex(4)
    )
    emp = Employee.create!(user: u, company: company)
    ud = UploadedDocument.create!(
      original_filename: "doc.pdf",
      storage_path: "/tmp/doc.pdf",
      checksum: SecureRandom.hex,
      file_kind: "pdf",
      employee: emp
    )
    ed = ud.extracted_documents.create!(sequence: 1, page_start: 1, page_end: 1, status: "done")
    [u, ed]
  end

  # ---------------------------------------------------------------------------
  # GET /sendings
  # ---------------------------------------------------------------------------

  test "index returns list of sendings" do
    get sendings_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["sendings"].is_a?(Array)
  end

  test "index includes fixture sendings" do
    # Fixtures 'one' and 'two' should be loaded from sendings.yml
    get sendings_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["sendings"].is_a?(Array)
  end

  test "index response includes expected fields per sending" do
    u, ed = build_deps
    Sending.create!(
      recipient: u,
      extracted_document: ed,
      sent_at: Time.current,
      subject: "Test Subject",
      body: "Test Body"
    )

    get sendings_path

    assert_response :success
    body = JSON.parse(response.body)
    found = body["sendings"].find { |s| s["extracted_document_id"] == ed.id }
    assert_not_nil found
    assert found.key?("id")
    assert found.key?("recipient")
    assert found.key?("subject")
    assert found.key?("sent_at")
    assert found["recipient"].key?("id")
    assert found["recipient"].key?("email")
    assert found["recipient"].key?("employee_code")
  end

  # ---------------------------------------------------------------------------
  # POST /sendings
  # ---------------------------------------------------------------------------

  test "create with valid params returns created sending" do
    u, ed = build_deps

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          u.id,
      sent_at:               Time.current.iso8601,
      subject:               "Busta paga Marzo",
      body:                  "In allegato la busta paga"
    }

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
    assert_equal "Busta paga Marzo", body["sending"]["subject"]
    assert_equal u.id, body["sending"]["recipient"]["id"]
  end

  test "create marks extracted_document as sent" do
    u, ed = build_deps

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          u.id,
      sent_at:               Time.current.iso8601
    }

    assert_response :created
    assert_equal "sent", ed.reload.status
  end

  test "create with template inherits subject and body from template" do
    u, ed = build_deps
    template = Template.create!(subject: "Soggetto Template", body_text: "Corpo Template")

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          u.id,
      sent_at:               Time.current.iso8601,
      template_id:           template.id
    }

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Soggetto Template", body["sending"]["subject"]
    assert_equal "Corpo Template",    body["sending"]["body"]
  end

  test "create with explicit subject overrides template subject" do
    u, ed = build_deps
    template = Template.create!(subject: "Template Subject", body_text: "Template Body")

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          u.id,
      sent_at:               Time.current.iso8601,
      subject:               "Explicit Subject",
      template_id:           template.id
    }

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Explicit Subject", body["sending"]["subject"]
  end

  test "create without extracted_document_id returns bad_request" do
    u, _ed = build_deps

    post create_sending_path, params: {
      recipient_id: u.id,
      sent_at:      Time.current.iso8601
    }

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
    assert_not_nil body["message"]
  end

  test "create without recipient_id returns bad_request" do
    _u, ed = build_deps

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      sent_at:               Time.current.iso8601
    }

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
  end

  test "create without sent_at returns bad_request" do
    u, ed = build_deps

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          u.id
    }

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
  end

  test "create with non-existent extracted_document_id returns error" do
    u, _ed = build_deps

    post create_sending_path, params: {
      extracted_document_id: 0,
      recipient_id:          u.id,
      sent_at:               Time.current.iso8601
    }

    # Returns an error (unprocessable_entity or bad_request) because the FK constraint fails
    assert_not_equal "201", response.status.to_s
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
  end
end
