require "test_helper"

class ProcessingItemTest < ActiveSupport::TestCase
  def parent_run
    @parent_run ||= ProcessingRun.create!(job_id: "pi-run-#{SecureRandom.hex(4)}")
  end

  def valid_item(overrides = {})
    ProcessingItem.new(
      { processing_run: parent_run, sequence: 1, filename: "doc.pdf" }.merge(overrides)
    )
  end

  test "valid item saves successfully" do
    assert valid_item.valid?
  end

  test "requires sequence" do
    item = valid_item(sequence: nil)
    assert_not item.valid?
    assert_includes item.errors[:sequence], "can't be blank"
  end

  test "sequence must be unique per processing_run at db level" do
    valid_item(sequence: 1).save!

    assert_raises(ActiveRecord::RecordNotUnique) do
      valid_item(sequence: 1).save!
    end
  end

  test "same sequence on different runs is allowed" do
    run2 = ProcessingRun.create!(job_id: "pi-run2-#{SecureRandom.hex(4)}")
    valid_item(sequence: 1).save!

    other = ProcessingItem.new(processing_run: run2, sequence: 1, filename: "doc.pdf")
    assert other.valid?
  end

  test "status must be in STATUSES or nil" do
    ProcessingItem::STATUSES.each do |s|
      assert valid_item(status: s).valid?, "expected status '#{s}' to be valid"
    end

    item = valid_item(status: "bogus")
    assert_not item.valid?
    assert_includes item.errors[:status], "is not included in the list"
  end

  test "status can be nil" do
    assert valid_item(status: nil).valid?
  end

  test "extracted_document is optional" do
    assert valid_item(extracted_document: nil).valid?
  end

  # ---------------------------------------------------------------------------
  # Predicate methods
  # ---------------------------------------------------------------------------

  test "done? returns true only when status is done" do
    assert valid_item(status: "done").done?
    assert_not valid_item(status: "queued").done?
    assert_not valid_item(status: "in_progress").done?
    assert_not valid_item(status: "failed").done?
  end

  test "failed? returns true only when status is failed" do
    assert valid_item(status: "failed").failed?
    assert_not valid_item(status: "done").failed?
  end

  test "in_progress? returns true only when status is in_progress" do
    assert valid_item(status: "in_progress").in_progress?
    assert_not valid_item(status: "done").in_progress?
    assert_not valid_item(status: "queued").in_progress?
  end

  test "queued? returns true only when status is queued" do
    assert valid_item(status: "queued").queued?
    assert_not valid_item(status: "done").queued?
  end

  test "STATUSES contains all expected statuses" do
    expected = %w[queued in_progress done failed]
    assert_equal expected, ProcessingItem::STATUSES
  end
end
