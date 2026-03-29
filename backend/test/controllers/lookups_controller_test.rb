require "test_helper"

class LookupsControllerTest < ActionDispatch::IntegrationTest
  # ---------------------------------------------------------------------------
  # GET /lookups/companies
  # ---------------------------------------------------------------------------

  test "companies returns an array" do
    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    assert body["companies"].is_a?(Array)
  end

  test "companies includes companies from companies table" do
    Company.create!(name: "ACME SpA")

    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    names = body["companies"].map { |c| c["name"] }
    assert_includes names, "ACME SpA"
  end

  test "companies returns names sorted alphabetically" do
    Company.create!(name: "Zeta Srl")
    Company.create!(name: "Alpha Srl")

    get lookups_companies_path

    assert_response :success
    body = JSON.parse(response.body)
    names = body["companies"].map { |c| c["name"] }
    assert_equal names, names.sort
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
    filter_co = Company.create!(name: "FilterCo#{SecureRandom.hex(3)}")
    other_co  = Company.create!(name: "OtherCo#{SecureRandom.hex(3)}")

    u1 = User.create!(email: "lk6@test.com", name: "LK6", username: "lk6#{SecureRandom.hex(3)}")
    emp1 = Employee.create!(user: u1, company: filter_co)

    u2 = User.create!(email: "lk7@test.com", name: "LK7", username: "lk7#{SecureRandom.hex(3)}")
    emp2 = Employee.create!(user: u2, company: other_co)

    get lookups_users_path, params: { company: filter_co.name }

    assert_response :success
    body = JSON.parse(response.body)
    ids = body["users"].map { |usr| usr["id"] }
    assert_includes ids, u1.id
    assert_not_includes ids, u2.id
  end
end
