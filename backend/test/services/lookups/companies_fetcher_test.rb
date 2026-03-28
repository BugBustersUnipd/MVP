require "test_helper"

class CompaniesFetcherTest < ActiveSupport::TestCase
  test "aggregates companies from uploaded documents and extracted metadata" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "cf1#{SecureRandom.hex(3)}@test", name: "C1", username: "cf1#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: u, company: company)

    ud = UploadedDocument.create!(original_filename: "a.pdf", storage_path: "/tmp/a", page_count: 1, checksum: "ch-cf1-#{SecureRandom.hex(4)}", override_company: "ACME_CF", file_kind: "pdf", employee: emp)
    ud2 = UploadedDocument.create!(original_filename: "b.pdf", storage_path: "/tmp/b", page_count: 1, checksum: "ch-cf2-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)

    ExtractedDocument.create!(uploaded_document: ud2, sequence: 1, page_start: 1, page_end: 1, metadata: { "company" => "BetaCF" })

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    assert_includes result, "ACME_CF"
    assert_includes result, "BetaCF"
  end

  test "skips extracted documents with null metadata" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "cf2#{SecureRandom.hex(3)}@test", name: "C2", username: "cf2#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: u, company: company)
    ud = UploadedDocument.create!(original_filename: "c.pdf", storage_path: "/tmp/c", page_count: 1, checksum: "ch-cf3-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)

    # metadata is nil (jsonb null)
    ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, metadata: nil)

    # Should not raise — nil metadata is skipped by `next unless m.is_a?(Hash)`
    assert_nothing_raised { DocumentProcessing::Lookups::CompaniesFetcher.new.call }
  end

  test "skips extracted documents whose metadata has no company key" do
    company = Company.first || Company.create!(name: "TestCo")
    u = User.create!(email: "cf3#{SecureRandom.hex(3)}@test", name: "C3", username: "cf3#{SecureRandom.hex(3)}")
    emp = Employee.create!(user: u, company: company)
    ud = UploadedDocument.create!(original_filename: "d.pdf", storage_path: "/tmp/d", page_count: 1, checksum: "ch-cf4-#{SecureRandom.hex(4)}", file_kind: "pdf", employee: emp)

    ExtractedDocument.create!(uploaded_document: ud, sequence: 1, page_start: 1, page_end: 1, metadata: { "other_field" => "value" })

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call
    # No company should come from this document
    assert_not_includes result, "value"
  end
end
