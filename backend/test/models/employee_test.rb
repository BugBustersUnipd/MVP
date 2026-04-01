require "test_helper"

class EmployeeTest < ActiveSupport::TestCase
  # Costruisce i dati di output per il flusso corrente.
  def build_employee(overrides = {})
    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(
      email: "#{SecureRandom.hex(4)}@emp.test",
      name: "Emp User",
      username: SecureRandom.hex(4)
    )
    Employee.new({ user: user, company: company, department: "HR" }.merge(overrides))
  end

  test "valid employee saves successfully" do
    emp = build_employee
    assert emp.valid?
    emp.save!
    assert emp.persisted?
  end

  test "requires user" do
    emp = build_employee(user: nil)
    assert_not emp.valid?
    assert emp.errors[:user].any?
  end

  test "requires company" do
    emp = build_employee(company: nil)
    assert_not emp.valid?
    assert emp.errors[:company].any?
  end

  test "department is optional" do
    emp = build_employee(department: nil)
    assert emp.valid?
  end

  test "department can be set and retrieved" do
    emp = build_employee(department: "Engineering")
    emp.save!
    assert_equal "Engineering", emp.reload.department
  end

  test "belongs_to user" do
    emp = build_employee
    emp.save!
    assert_not_nil emp.user
    assert_instance_of User, emp.user
  end

  test "belongs_to company" do
    emp = build_employee
    emp.save!
    assert_not_nil emp.company
    assert_instance_of Company, emp.company
  end

  test "fixture one has correct associations" do
    emp = employees(:one)
    assert_equal users(:one), emp.user
    assert_equal companies(:one), emp.company
  end

  test "fixture two has correct associations" do
    emp = employees(:two)
    assert_equal users(:two), emp.user
    assert_equal companies(:two), emp.company
  end

  test "same user cannot be employee of two companies" do
    
    company2 = Company.create!(name: "Second Co")
    emp = employees(:one)
    emp2 = Employee.new(user: emp.user, company: company2)
    
    assert emp2.valid?
  end
end
