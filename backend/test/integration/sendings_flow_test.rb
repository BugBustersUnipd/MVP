require "test_helper"

class SendingsFlowTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  def create_user(suffix: SecureRandom.hex(4))
    User.create!(
      email:    "#{suffix}@sendings.test",
      name:     "Sender #{suffix}",
      username: "sender_#{suffix}"
    )
  end

  def create_extracted_document(uploaded_document:)
    uploaded_document.extracted_documents.create!(
      sequence:   1,
      page_start: 1,
      page_end:   1,
      status:     "done"
    )
  end

  def create_uploaded_document(employee:, checksum: SecureRandom.hex)
    UploadedDocument.create!(
      original_filename: "source.pdf",
      storage_path:      "/tmp/source.pdf",
      page_count:        1,
      checksum:          checksum,
      file_kind:         "pdf",
      employee:          employee
    )
  end

  # ---------------------------------------------------------------------------
  # GET /sendings
  # ---------------------------------------------------------------------------

  test "index returns list of sendings" do
    company  = Company.first || Company.create!(name: "SendingsCo")
    user     = create_user
    emp      = Employee.create!(user: user, company: company)
    uploaded = create_uploaded_document(employee: emp)
    ed       = create_extracted_document(uploaded_document: uploaded)

    Sending.create!(
      recipient:          user,
      extracted_document: ed,
      sent_at:            Time.current,
      subject:            "Test Subject",
      body:               "Test Body"
    )

    get sendings_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("sendings")
    assert body["sendings"].any?
    s = body["sendings"].first
    assert s.key?("id")
    assert s.key?("recipient")
    assert s.key?("sent_at")
  end

  # ---------------------------------------------------------------------------
  # POST /sendings — success
  # ---------------------------------------------------------------------------

  test "create returns 201 with valid params" do
    company  = Company.first || Company.create!(name: "SendingsCo")
    user     = create_user
    emp      = Employee.create!(user: user, company: company)
    uploaded = create_uploaded_document(employee: emp)
    ed       = create_extracted_document(uploaded_document: uploaded)

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          user.id,
      sent_at:               Time.current.iso8601,
      subject:               "Integrazione",
      body:                  "Corpo del messaggio"
    }, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
    assert body["sending"]["id"].present?
    assert_equal "Integrazione", body["sending"]["subject"]

    ed.reload
    assert_equal "sent", ed.status
  end

  test "create inherits subject and body from template when not provided" do
    company  = Company.first || Company.create!(name: "SendingsCo")
    user     = create_user
    emp      = Employee.create!(user: user, company: company)
    uploaded = create_uploaded_document(employee: emp)
    ed       = create_extracted_document(uploaded_document: uploaded)
    template = Template.create!(subject: "Template Subj", body_text: "Template Body")

    post create_sending_path, params: {
      extracted_document_id: ed.id,
      recipient_id:          user.id,
      sent_at:               Time.current.iso8601,
      template_id:           template.id
    }, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Template Subj", body["sending"]["subject"]
    assert_equal "Template Body", body["sending"]["body"]
  end

  # ---------------------------------------------------------------------------
  # POST /sendings — validation errors
  # ---------------------------------------------------------------------------

  test "create returns bad_request when required params are missing" do
    post create_sending_path, params: { subject: "Solo subject" }, as: :json

    assert_response :bad_request
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
    assert body["message"].present?
  end

  test "create returns error when extracted_document_id does not exist" do
    user = create_user

    post create_sending_path, params: {
      extracted_document_id: 0,
      recipient_id:          user.id,
      sent_at:               Time.current.iso8601
    }, as: :json

    assert_includes [400, 422], response.status
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
  end
end
