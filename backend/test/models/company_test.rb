require "test_helper"

class CompanyTest < ActiveSupport::TestCase
  test "creates company with name" do
    company = Company.new(name: "ACME SpA")
    assert company.valid?
    company.save!
    assert_equal "ACME SpA", Company.find(company.id).name
  end

  test "company can be created without name" do
    # Company model has no explicit validates statements
    company = Company.new
    assert company.valid?
  end

  test "fixture one is accessible and has correct name" do
    company = companies(:one)
    assert_not_nil company
    assert_not_nil company.id
    assert_not_nil company.name
  end

  test "fixture two is accessible" do
    company = companies(:two)
    assert_not_nil company
    assert_not_nil company.id
  end

  test "employees can be associated to a company via Employee" do
    company = companies(:one)
    emp = employees(:one)
    assert_equal company.id, emp.company_id
  end

  test "multiple employees can share the same company" do
    company = Company.create!(name: "Multi Co")
    u1 = User.create!(email: "mc1@test.com", name: "MC1", username: "mc1#{SecureRandom.hex(3)}")
    u2 = User.create!(email: "mc2@test.com", name: "MC2", username: "mc2#{SecureRandom.hex(3)}")
    Employee.create!(user: u1, company: company)
    Employee.create!(user: u2, company: company)

    
    assert_equal 2, Employee.where(company: company).count
  end
end
