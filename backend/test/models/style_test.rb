require "test_helper"

class StyleTest < ActiveSupport::TestCase
  def build_style(overrides = {})
    Style.new({ company: companies(:one), name: "Formal", description: "Formal writing style" }.merge(overrides))
  end

  test "fixture one is accessible" do
    style = styles(:one)
    assert_not_nil style
    assert_not_nil style.id
  end

  test "valid style saves successfully" do
    style = build_style
    assert style.valid?
    style.save!
    assert style.persisted?
  end

  test "requires company" do
    style = build_style(company: nil)
    assert_not style.valid?
    assert style.errors[:company].any?
  end

  test "belongs_to company" do
    style = styles(:one)
    assert_equal companies(:one), style.company
  end

  test "name can be stored and retrieved" do
    style = build_style(name: "Casual")
    style.save!
    assert_equal "Casual", style.reload.name
  end

  test "description can be stored and retrieved" do
    style = build_style(description: "A casual, friendly tone")
    style.save!
    assert_equal "A casual, friendly tone", style.reload.description
  end

  test "name is required at model level" do
    style = build_style(name: nil)
    assert_not style.valid?
    assert style.errors[:name].any?
  end
end
