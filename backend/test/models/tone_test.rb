require "test_helper"

class ToneTest < ActiveSupport::TestCase
  def build_tone(overrides = {})
    Tone.new({ company: companies(:one), name: "Professional", description: "Professional tone" }.merge(overrides))
  end

  test "fixture one is accessible" do
    tone = tones(:one)
    assert_not_nil tone
    assert_not_nil tone.id
  end

  test "valid tone saves successfully" do
    tone = build_tone
    assert tone.valid?
    tone.save!
    assert tone.persisted?
  end

  test "requires company" do
    tone = build_tone(company: nil)
    assert_not tone.valid?
    assert tone.errors[:company].any?
  end

  test "belongs_to company" do
    tone = tones(:one)
    assert_equal companies(:one), tone.company
  end

  test "name can be stored and retrieved" do
    tone = build_tone(name: "Informal")
    tone.save!
    assert_equal "Informal", tone.reload.name
  end

  test "description can be stored and retrieved" do
    tone = build_tone(description: "Friendly and approachable")
    tone.save!
    assert_equal "Friendly and approachable", tone.reload.description
  end

  test "name is required at model level" do
    tone = build_tone(name: nil)
    assert_not tone.valid?
    assert tone.errors[:name].any?
  end
end
