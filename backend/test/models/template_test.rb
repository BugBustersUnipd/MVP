require "test_helper"

class TemplateTest < ActiveSupport::TestCase
  test "creates with body_text and subject" do
    t = Template.create!(body_text: "Ciao {{name}}", subject: "Busta paga")
    t.reload
    assert_equal "Ciao {{name}}", t.body_text
    assert_equal "Busta paga",    t.subject
  end

  test "body alias maps to body_text" do
    t = Template.new(body_text: "Il testo")
    assert_equal "Il testo", t.body

    t.body = "Nuovo testo"
    assert_equal "Nuovo testo", t.body_text
  end

  test "body_text can be nil" do
    t = Template.new(subject: "Solo soggetto")
    assert t.valid?
  end

  test "subject can be nil" do
    t = Template.new(body_text: "Solo corpo")
    assert t.valid?
  end
end
