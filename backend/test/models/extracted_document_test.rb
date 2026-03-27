require "test_helper"

class ExtractedDocumentTest < ActiveSupport::TestCase
  def uploaded_doc
    @uploaded_doc ||= uploaded_documents(:one)
  end

  def valid_ed(overrides = {})
    ExtractedDocument.new(
      {
        uploaded_document: uploaded_doc,
        sequence:          1,
        page_start:        1,
        page_end:          2
      }.merge(overrides)
    )
  end

  test "valid record saves successfully" do
    assert valid_ed.valid?
  end

  test "requires sequence" do
    ed = valid_ed(sequence: nil)
    assert_not ed.valid?
    assert_includes ed.errors[:sequence], "can't be blank"
  end

  test "requires page_start" do
    ed = valid_ed(page_start: nil)
    assert_not ed.valid?
    assert ed.errors[:page_start].any?
  end

  test "requires page_end" do
    ed = valid_ed(page_end: nil)
    assert_not ed.valid?
    assert ed.errors[:page_end].any?
  end

  test "page_start and page_end must be > 0" do
    assert_not valid_ed(page_start: 0).valid?
    assert_not valid_ed(page_end: 0).valid?
    assert_not valid_ed(page_start: -1).valid?
  end

  test "page_end must be >= page_start" do
    ed = valid_ed(page_start: 3, page_end: 2)
    assert_not ed.valid?
    assert ed.errors[:page_end].any?
  end

  test "page_end equal to page_start is valid" do
    assert valid_ed(page_start: 2, page_end: 2).valid?
  end

  test "status must be in STATUSES or nil" do
    ExtractedDocument::STATUSES.each do |s|
      assert valid_ed(status: s).valid?, "expected status '#{s}' to be valid"
    end

    ed = valid_ed(status: "unknown_status")
    assert_not ed.valid?
    assert_includes ed.errors[:status], "is not included in the list"
  end

  test "status can be nil" do
    assert valid_ed(status: nil).valid?
  end

  test "recipient is a plain text field" do
    ed = valid_ed(sequence: 99, recipient: "Mario Rossi")
    ed.save!
    assert_equal "Mario Rossi", ed.reload.recipient
  end

  test "confidence is stored and returned as a hash" do
    ed = valid_ed(sequence: 98, confidence: { "company" => 0.9, "recipient" => 0.7 })
    ed.save!
    ed.reload
    assert_equal 0.9, ed.confidence["company"]
    assert_equal 0.7, ed.confidence["recipient"]
  end

  test "belongs_to uploaded_document" do
    ed = valid_ed
    assert_equal uploaded_doc, ed.uploaded_document
  end

  test "matched_employee association is optional" do
    assert valid_ed(matched_employee: nil).valid?
  end
end
