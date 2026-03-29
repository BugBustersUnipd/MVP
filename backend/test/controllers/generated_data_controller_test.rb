require "test_helper"

class GeneratedDataControllerTest < ActionDispatch::IntegrationTest
  def setup
    @company = Company.create!(name: "Test Corp", description: "Azienda di test")
    @tone    = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style   = Style.create!(company: @company, name: "Modern", description: "Modern style")

    @parent = GeneratedDatum.create!(
      company:   @company,
      tone:      @tone,
      style:     @style,
      prompt:    "Scrivi un post sul prodotto",
      status:    "completed",
      title:     "Titolo originale",
      text_result: "Testo originale"
    )

    # Blocca il job reale durante i test
    AiGeneratorJob.stubs(:perform_later)
  end

  # === POST /generated_data/:id/regenerate ===

  test "regenerate crea un nuovo GeneratedDatum" do
    assert_difference "GeneratedDatum.count", 1 do
      post regenerate_generated_data_path(@parent.id)
    end
  end

  test "regenerate risponde con status 200 e id del nuovo record" do
    post regenerate_generated_data_path(@parent.id)

    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal "started", json["status"]
    assert json["id"].present?
    assert_not_equal @parent.id, json["id"]
  end

  test "regenerate copia prompt, tone, style e company dal parent" do
    post regenerate_generated_data_path(@parent.id)

    nuovo = GeneratedDatum.find(JSON.parse(response.body)["id"])

    assert_equal @parent.prompt,     nuovo.prompt
    assert_equal @parent.company_id, nuovo.company_id
    assert_equal @parent.tone_id,    nuovo.tone_id
    assert_equal @parent.style_id,   nuovo.style_id
  end

  test "regenerate imposta version_id al parent" do
    post regenerate_generated_data_path(@parent.id)

    nuovo = GeneratedDatum.find(JSON.parse(response.body)["id"])
    assert_equal @parent.id, nuovo.version_id
  end

  test "regenerate parte con status pending" do
    post regenerate_generated_data_path(@parent.id)

    nuovo = GeneratedDatum.find(JSON.parse(response.body)["id"])
    assert_equal "pending", nuovo.status
  end

  test "regenerate lancia il job di generazione" do
    AiGeneratorJob.expects(:perform_later).once
    post regenerate_generated_data_path(@parent.id)
  end

  test "regenerate restituisce 404 se il parent non esiste" do
    post regenerate_generated_data_path(99999)
    assert_response :not_found
  end

  test "rigenerazioni multiple dallo stesso parent hanno tutte version_id uguale al parent" do
    post regenerate_generated_data_path(@parent.id)
    id1 = JSON.parse(response.body)["id"]

    post regenerate_generated_data_path(@parent.id)
    id2 = JSON.parse(response.body)["id"]

    assert_not_equal id1, id2
    assert_equal @parent.id, GeneratedDatum.find(id1).version_id
    assert_equal @parent.id, GeneratedDatum.find(id2).version_id
  end

  test "regenerate non copia title e text_result del parent" do
    post regenerate_generated_data_path(@parent.id)

    nuovo = GeneratedDatum.find(JSON.parse(response.body)["id"])
    assert_nil nuovo.title
    assert_nil nuovo.text_result
  end
end
