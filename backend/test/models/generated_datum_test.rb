require "test_helper"

class GeneratedDatumTest < ActiveSupport::TestCase
  def build_datum(overrides = {})
    company = companies(:one)
    tone    = tones(:one)
    style   = styles(:one)
    GeneratedDatum.new({
      company: company,
      tone: tone,
      style: style,
      prompt: "Generate a post",
      status: "draft"
    }.merge(overrides))
  end

  test "fixture one is accessible" do
    datum = generated_data(:one)
    assert_not_nil datum
    assert_not_nil datum.id
  end

  test "valid datum saves successfully" do
    datum = build_datum
    assert datum.valid?
    datum.save!
    assert datum.persisted?
  end

  test "requires tone" do
    datum = build_datum(tone: nil)
    assert_not datum.valid?
    assert datum.errors[:tone].any?
  end

  test "requires style" do
    datum = build_datum(style: nil)
    assert_not datum.valid?
    assert datum.errors[:style].any?
  end

  test "requires company" do
    datum = build_datum(company: nil)
    assert_not datum.valid?
    assert datum.errors[:company].any?
  end

  test "version (self-join) is optional" do
    datum = build_datum(version: nil)
    assert datum.valid?
  end

  test "can reference another GeneratedDatum as version" do
    parent = build_datum
    parent.save!

    child = build_datum(version: parent)
    assert child.valid?
    child.save!

    assert_equal parent, child.version
  end

  test "belongs_to tone" do
    datum = generated_data(:one)
    assert_equal tones(:one), datum.tone
  end

  test "belongs_to style" do
    datum = generated_data(:one)
    assert_equal styles(:one), datum.style
  end

  test "belongs_to company" do
    datum = generated_data(:one)
    assert_equal companies(:one), datum.company
  end

  test "text_result can be stored and retrieved" do
    datum = build_datum(text_result: "Generated text content here")
    datum.save!
    assert_equal "Generated text content here", datum.reload.text_result
  end
end
