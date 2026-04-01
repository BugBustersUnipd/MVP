require "test_helper"

class GeneratedDataFlowTest < ActionDispatch::IntegrationTest
  # Preparazione dati di test.
  def setup
    @company = Company.create!(name: "Flow Company", description: "Flow description")
    @tone = Tone.create!(company: @company, name: "Flow Tone", description: "Tone desc", is_active: true)
    @style = Style.create!(company: @company, name: "Flow Style", description: "Style desc", is_active: true)

    @parent = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Prompt flow",
      status: "completed",
      title: "Titolo parent",
      text_result: "Testo parent"
    )

    AiGeneratorJob.stubs(:perform_later)
  end

  test "create starts generation when tone and style are active" do
    assert_difference "GeneratedDatum.count", 1 do
      post create_generated_data_path,
           params: {
             generation_datum: {
               prompt: "Nuova generazione flow",
               company_id: @company.id,
               tone_id: @tone.id,
               style_id: @style.id
             }
           },
           as: :json
    end

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal "started", body["status"]
    assert body["id"].present?
  end

  test "create returns 422 when tone is inactive" do
    @tone.update!(is_active: false)

    assert_no_difference "GeneratedDatum.count" do
      post create_generated_data_path,
           params: {
             generation_datum: {
               prompt: "Nuova generazione flow",
               company_id: @company.id,
               tone_id: @tone.id,
               style_id: @style.id
             }
           },
           as: :json
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_includes body["error"], "tone"
  end

  test "regenerate returns 422 when style is inactive" do
    @style.update!(is_active: false)

    assert_no_difference "GeneratedDatum.count" do
      post regenerate_generated_data_path(@parent.id), as: :json
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_includes body["error"], "style"
  end
end
