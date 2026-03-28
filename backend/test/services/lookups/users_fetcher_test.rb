require "test_helper"

class UsersFetcherTest < ActiveSupport::TestCase
  test "returns all employees when no company provided" do
    company = Company.first || Company.create!(name: "TestCo")
    u1 = User.create!(email: "m@x.it", name: "Mario", username: "m1")
    e1 = Employee.create!(user: u1, company: company)
    u2 = User.create!(email: "l@x.it", name: "Luigi", username: "l1")
    e2 = Employee.create!(user: u2, company: company)

    result = DocumentProcessing::Lookups::UsersFetcher.new.call

    assert_includes result, e1
    assert_includes result, e2
  end

  test "returns all employees when company is empty string" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "empty#{SecureRandom.hex(3)}@x.it", name: "Empty", username: "empty#{SecureRandom.hex(3)}")
    e = Employee.create!(user: u, company: company)

    result = DocumentProcessing::Lookups::UsersFetcher.new.call(company: "")
    assert_includes result, e
  end

  test "skips extracted documents with non-hash metadata" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "nh#{SecureRandom.hex(3)}@x.it", name: "NoHash", username: "nohash#{SecureRandom.hex(3)}")
    e = Employee.create!(user: u, company: company)
    ud = UploadedDocument.create!(original_filename: "x.pdf", storage_path: "/tmp/x", page_count: 1, checksum: "uf-nh-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: e)
    ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, metadata: nil, matched_employee: u)

    assert_nothing_raised { DocumentProcessing::Lookups::UsersFetcher.new.call(company: "ACME") }
  end

  test "filters employees by override_company and metadata company" do
    company = Company.first || Company.create!(name: "TestCo")
    u1 = User.create!(email: "m@x.it", name: "Mario", username: "m1")
    e1 = Employee.create!(user: u1, company: company)
    u2 = User.create!(email: "l@x.it", name: "Luigi", username: "l1")
    e2 = Employee.create!(user: u2, company: company)

    ud = UploadedDocument.create!(original_filename: "a.pdf", storage_path: "/tmp/a", page_count: 1, checksum: "ch3", override_company: "ACME", file_kind: "pdf", employee: e1)
    ed = ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, matched_employee: u1, metadata: {})

    ud2 = UploadedDocument.create!(original_filename: "b.pdf", storage_path: "/tmp/b", page_count: 1, checksum: "ch4", file_kind: "pdf", employee: e2)
    ExtractedDocument.create!(uploaded_document: ud2, sequence: 1, page_start: 1, page_end: 1, matched_employee: u2, metadata: { "company" => "Beta" })

    res_acme = DocumentProcessing::Lookups::UsersFetcher.new.call(company: "ACME")
    assert_equal [e1], res_acme.to_a

    res_beta = DocumentProcessing::Lookups::UsersFetcher.new.call(company: "Beta")
    assert_equal [e2], res_beta.to_a
  end
end
