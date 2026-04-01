require "test_helper"

class LookupsFlowTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  def create_employee(company:, email_suffix: SecureRandom.hex(4))
    u = User.create!(
      email: "#{email_suffix}@lookup.test",
      name:  "Lookup #{email_suffix}",
      username: "lookup_#{email_suffix}"
    )
    Employee.create!(user: u, company: company)
  end

  # ---------------------------------------------------------------------------
  # GET /lookups/companies
  # ---------------------------------------------------------------------------

  test "companies returns list of company names" do
    Company.create!(name: "LookupCo #{SecureRandom.hex(3)}")

    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("companies")
    assert_instance_of Array, body["companies"]
  end

  # ---------------------------------------------------------------------------
  # GET /lookups/users
  # ---------------------------------------------------------------------------

  test "users returns all users when no company param" do
    company = Company.first || Company.create!(name: "DefaultCo")
    create_employee(company: company)

    get lookups_users_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("users")
    assert body["users"].any?
    first = body["users"].first
    assert first.key?("id")
    assert first.key?("name")
    assert first.key?("email")
  end

  test "users filters by company name via metadata match" do
    company_a = Company.create!(name: "AlphaLookup #{SecureRandom.hex(3)}")
    company_b = Company.create!(name: "BetaLookup #{SecureRandom.hex(3)}")

    emp_a = create_employee(company: company_a, email_suffix: "alpha_#{SecureRandom.hex(3)}")
    emp_b = create_employee(company: company_b, email_suffix: "beta_#{SecureRandom.hex(3)}")

    # Upload + estratto document linking emp_a.user via metadati["company"]
    uploaded = UploadedDocument.create!(
      original_filename: "x.pdf", storage_path: "/tmp/x.pdf",
      page_count: 1, checksum: SecureRandom.hex, file_kind: "pdf", employee: emp_a
    )
    ExtractedDocument.create!(
      uploaded_document: uploaded,
      sequence: 1, page_start: 1, page_end: 1, status: "done",
      metadata: { "company" => company_a.name },
      matched_employee_id: emp_a.user_id
    )

    get lookups_users_path, params: { company: company_a.name }

    assert_response :success
    body = JSON.parse(response.body)
    assert body["users"].any?, "Expected at least one user for company_a"
    user_ids = body["users"].map { |u| u["id"] }
    assert_includes user_ids, emp_a.user_id
    assert_not_includes user_ids, emp_b.user_id
  end

  test "users returns empty list for unknown company" do
    get lookups_users_path, params: { company: "NonExistentCompanyXYZ" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal [], body["users"]
  end
end
