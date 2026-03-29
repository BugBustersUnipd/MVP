require "test_helper"

class UsersFetcherTest < ActiveSupport::TestCase
  test "returns all employees when no company provided" do
    company = Company.create!(name: "TestCo#{SecureRandom.hex(3)}")
    u1 = User.create!(email: "m#{SecureRandom.hex(3)}@x.it", name: "Mario", username: "m#{SecureRandom.hex(3)}")
    e1 = Employee.create!(user: u1, company: company)
    u2 = User.create!(email: "l#{SecureRandom.hex(3)}@x.it", name: "Luigi", username: "l#{SecureRandom.hex(3)}")
    e2 = Employee.create!(user: u2, company: company)

    result = DocumentProcessing::Lookups::UsersFetcher.new.call

    assert_includes result, e1
    assert_includes result, e2
  end

  test "returns all employees when company is empty string" do
    company = Company.create!(name: "TestCo#{SecureRandom.hex(3)}")
    u = User.create!(email: "empty#{SecureRandom.hex(3)}@x.it", name: "Empty", username: "empty#{SecureRandom.hex(3)}")
    e = Employee.create!(user: u, company: company)

    result = DocumentProcessing::Lookups::UsersFetcher.new.call(company: "")
    assert_includes result, e
  end

  test "filters employees by company name from DB" do
    acme = Company.create!(name: "ACME#{SecureRandom.hex(3)}")
    beta = Company.create!(name: "Beta#{SecureRandom.hex(3)}")

    u1 = User.create!(email: "m#{SecureRandom.hex(3)}@x.it", name: "Mario", username: "m#{SecureRandom.hex(3)}")
    e1 = Employee.create!(user: u1, company: acme)

    u2 = User.create!(email: "l#{SecureRandom.hex(3)}@x.it", name: "Luigi", username: "l#{SecureRandom.hex(3)}")
    e2 = Employee.create!(user: u2, company: beta)

    res_acme = DocumentProcessing::Lookups::UsersFetcher.new.call(company: acme.name)
    assert_includes res_acme, e1
    assert_not_includes res_acme, e2

    res_beta = DocumentProcessing::Lookups::UsersFetcher.new.call(company: beta.name)
    assert_includes res_beta, e2
    assert_not_includes res_beta, e1
  end

  test "returns empty when company does not exist in DB" do
    result = DocumentProcessing::Lookups::UsersFetcher.new.call(company: "NonExistent#{SecureRandom.hex(4)}")
    assert_empty result
  end
end
