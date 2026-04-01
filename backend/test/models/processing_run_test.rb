require "test_helper"

class ProcessingRunTest < ActiveSupport::TestCase
  # Verifica le condizioni richieste prima di procedere.
  def valid_run(overrides = {})
    ProcessingRun.new({ job_id: SecureRandom.uuid }.merge(overrides))
  end

  test "valid run saves successfully" do
    assert valid_run.valid?
  end

  test "requires job_id" do
    run = valid_run(job_id: nil)
    assert_not run.valid?
    assert_includes run.errors[:job_id], "can't be blank"
  end

  test "job_id must be unique" do
    fixed = "fixed-job-#{SecureRandom.hex(4)}"
    valid_run(job_id: fixed).save!

    duplicate = valid_run(job_id: fixed)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:job_id], "has already been taken"
  end

  test "status must be in STATUSES or nil" do
    ProcessingRun::STATUSES.each do |s|
      assert valid_run(status: s).valid?, "expected status '#{s}' to be valid"
    end

    run = valid_run(status: "bad_status")
    assert_not run.valid?
    assert_includes run.errors[:status], "is not included in the list"
  end

  test "status can be nil" do
    assert valid_run(status: nil).valid?
  end

  test "uploaded_document is optional" do
    assert valid_run(uploaded_document: nil).valid?
  end

  test "has_many processing_items destroyed with run" do
    run = valid_run
    run.save!
    run.processing_items.create!(sequence: 1, filename: "f.pdf")

    assert_difference "ProcessingItem.count", -1 do
      run.destroy
    end
  end
end
