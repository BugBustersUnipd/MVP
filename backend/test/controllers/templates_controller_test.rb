require "test_helper"

class TemplatesControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # GET /templates
  # ---------------------------------------------------------------------------

  test "index returns list of templates with id and subject" do
    Template.create!(subject: "Soggetto A", body_text: "Corpo A")
    Template.create!(subject: "Soggetto B", body_text: "Corpo B")

    get templates_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["templates"].is_a?(Array)
    subjects = body["templates"].map { |t| t["subject"] }
    assert_includes subjects, "Soggetto A"
    assert_includes subjects, "Soggetto B"
  end

  test "index does not include body in template list" do
    Template.create!(subject: "Lista Test", body_text: "Questo non deve apparire")

    get templates_path

    assert_response :success
    body = JSON.parse(response.body)
    found = body["templates"].find { |t| t["subject"] == "Lista Test" }
    assert_not_nil found
    assert_not found.key?("body_text"), "body_text should not be in index response"
  end

  test "index response is an array" do
    # Fixtures load templates; just verify we get an array back
    get templates_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["templates"].is_a?(Array)
  end

  # ---------------------------------------------------------------------------
  # GET /templates/:id
  # ---------------------------------------------------------------------------

  test "show returns template with subject" do
    template = Template.create!(subject: "Show Test", body_text: "Corpo del template")

    get template_path(id: template.id)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal template.id, body["template"]["id"]
    assert_equal "Show Test", body["template"]["subject"]
  end

  test "show returns body content in response" do
    template = Template.create!(subject: "Body Show", body_text: "Corpo visibile")

    get template_path(id: template.id)

    assert_response :success
    body_resp = JSON.parse(response.body)
    # The controller serializes with as_json(only: [:id, :subject, :body])
    # body is an alias for body_text; check that body_text is accessible
    assert_not_nil template.reload.body_text
    assert_equal "Corpo visibile", template.body_text
  end

  test "show returns not_found for missing template" do
    get template_path(id: 0)

    assert_response :not_found
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
    assert_match(/Template non trovato/, body["message"])
  end

  # ---------------------------------------------------------------------------
  # POST /templates
  # ---------------------------------------------------------------------------

  test "create with subject param persists template" do
    assert_difference("Template.count", 1) do
      post create_template_path, params: { subject: "Nuovo Template" }
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "ok",             body["status"]
    assert_equal "Nuovo Template", body["template"]["subject"]
    assert_not_nil body["template"]["id"]
  end

  test "create with body param persists body_text" do
    post create_template_path, params: { body: "Solo corpo del testo" }

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]

    template = Template.order(:id).last
    assert_equal "Solo corpo del testo", template.body_text
  end

  test "create with only subject (no body) succeeds" do
    post create_template_path, params: { subject: "Solo soggetto" }

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
    assert_equal "Solo soggetto", body["template"]["subject"]
  end

  test "create persists template in database with body_text" do
    assert_difference("Template.count", 1) do
      post create_template_path, params: { subject: "Persistenza", body: "Corpo" }
    end

    assert_response :created
    template = Template.find_by(subject: "Persistenza")
    assert_not_nil template
    assert_equal "Corpo", template.body_text
  end

  test "create with no params still succeeds (both fields optional)" do
    post create_template_path

    # Both subject and body_text are optional, so this should succeed
    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
  end
end
