require "test_helper"

class LookupsControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # GET /lookups/companies
  # ---------------------------------------------------------------------------

  test "companies returns empty array when no data" do
    # Ensure no override_company or metadata companies exist
    UploadedDocument.update_all(override_company: nil)
    ExtractedDocument.update_all(metadata: {})

    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["companies"].is_a?(Array)
  end

  test "companies aggregates override_company from uploaded documents" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "lk1@test.com", name: "LK1", username: "lk1#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: u, company: company)

    UploadedDocument.create!(
      original_filename: "a.pdf", storage_path: "/tmp/a", page_count: 1,
      checksum: "lk-company-#{SecureRandom.hex(4)}", file_kind: "pdf",
      override_company: "ACME SpA", employee: emp
    )

    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    assert_includes body["companies"], "ACME SpA"
  end

  test "companies aggregates companies from extracted document metadata" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "lk2@test.com", name: "LK2", username: "lk2#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: u, company: company)

    ud = UploadedDocument.create!(
      original_filename: "b.pdf", storage_path: "/tmp/b", page_count: 1,
      checksum: "lk-meta-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp
    )
    ud.extracted_documents.create!(
      sequence: 1, page_start: 1, page_end: 1,
      metadata: { "company" => "Beta Srl" }
    )

    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    assert_includes body["companies"], "Beta Srl"
  end

  # ---------------------------------------------------------------------------
  # GET /lookups/users
  # ---------------------------------------------------------------------------

  test "users without company param returns all employees" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "lk3@test.com", name: "LK3", username: "lk3#{SecureRandom.hex(3)}")
    Employee.create!(user: u, company: company)

    get lookups_users_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["users"].is_a?(Array)
    ids = body["users"].map { |usr| usr["id"] }
    assert_includes ids, u.id
  end

  test "users response includes id, name, email, employee_code fields" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "lk4@test.com", name: "LK4 User", username: "lk4#{SecureRandom.hex(3)}")
    Employee.create!(user: u, company: company)

    get lookups_users_path

    assert_response :success
    body = JSON.parse(response.body)
    found = body["users"].find { |usr| usr["id"] == u.id }
    assert_not_nil found
    assert found.key?("id")
    assert found.key?("name")
    assert found.key?("email")
    assert found.key?("employee_code")
  end

  test "users with empty company param returns all employees" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "lk5@test.com", name: "LK5", username: "lk5#{SecureRandom.hex(3)}")
    Employee.create!(user: u, company: company)

    get lookups_users_path, params: { company: "" }

    assert_response :success
    body = JSON.parse(response.body)
    ids = body["users"].map { |usr| usr["id"] }
    assert_includes ids, u.id
  end

  test "users filtered by company returns only matching employees" do
    company = Company.first || Company.create!(name: "TestCo")

    u1 = User.create!(email: "lk6@test.com", name: "LK6", username: "lk6#{SecureRandom.hex(3)}")
    emp1 = Employee.create!(user: u1, company: company)

    u2 = User.create!(email: "lk7@test.com", name: "LK7", username: "lk7#{SecureRandom.hex(3)}")
    emp2 = Employee.create!(user: u2, company: company)

    ud = UploadedDocument.create!(
      original_filename: "c.pdf", storage_path: "/tmp/c", page_count: 1,
      checksum: "lk-filter-#{SecureRandom.hex(4)}", file_kind: "pdf",
      override_company: "FilterCo", employee: emp1
    )
    ud.extracted_documents.create!(
      sequence: 1, page_start: 1, page_end: 1,
      matched_employee: u1, metadata: {}
    )

    get lookups_users_path, params: { company: "FilterCo" }

    assert_response :success
    body = JSON.parse(response.body)
    ids = body["users"].map { |usr| usr["id"] }
    assert_includes ids, u1.id
    assert_not_includes ids, u2.id
  end
end
