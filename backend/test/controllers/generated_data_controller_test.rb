require "test_helper"

class GeneratedDataControllerTest < ActionDispatch::IntegrationTest
  # Preparazione dati di test.
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

  test "regenerate restituisce 422 se il tone del parent non e attivo" do
    @tone.update!(is_active: false)

    assert_no_difference "GeneratedDatum.count" do
      post regenerate_generated_data_path(@parent.id)
    end

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_includes json["error"], "tone"
  end

  test "regenerate restituisce 422 se lo style del parent non e attivo" do
    @style.update!(is_active: false)

    assert_no_difference "GeneratedDatum.count" do
      post regenerate_generated_data_path(@parent.id)
    end

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_includes json["error"], "style"
  end

  test "create restituisce 422 se tone o style non sono attivi" do
    @tone.update!(is_active: false)

    assert_no_difference "GeneratedDatum.count" do
      post create_generated_data_path, params: {
        generation_datum: {
          prompt: "Nuova generazione",
          company_id: @company.id,
          tone_id: @tone.id,
          style_id: @style.id
        }
      }
    end

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_includes json["error"], "tone"
  end

  # === GET /generated_data/:id ===

  test "show restituisce i dati di una generazione completata" do
    get generated_data_path(@parent.id)

    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal @parent.id,          json["id"]
    assert_equal @parent.title,       json["title"]
    assert_equal @parent.text_result, json["text_result"]
  end

  test "show restituisce 404 se la generazione non esiste" do
    get generated_data_path(99999)

    assert_response :not_found
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "show restituisce 404 se la generazione non è completata" do
    pending = GeneratedDatum.create!(
      company: @company, tone: @tone, style: @style,
      prompt: "In attesa", status: "pending"
    )

    get generated_data_path(pending.id)

    assert_response :not_found
  end

  # === PATCH /generated_data/:id/rating ===

  test "rating salva il valore e risponde con 200" do
    patch rating_generated_data_path(@parent.id), params: { rating: 4 }

    assert_response :ok
    json = JSON.parse(response.body)
    assert json["message"].present?
    assert_equal 4, @parent.reload.rating
  end

  test "rating accetta valori da 1 a 5" do
    [1, 2, 3, 4, 5].each do |v|
      patch rating_generated_data_path(@parent.id), params: { rating: v }
      assert_response :ok
      assert_equal v, @parent.reload.rating
    end
  end

  test "rating restituisce 400 se il valore è fuori range" do
    patch rating_generated_data_path(@parent.id), params: { rating: 6 }

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "rating restituisce 400 se il valore è 0" do
    patch rating_generated_data_path(@parent.id), params: { rating: 0 }

    assert_response :bad_request
  end

  test "rating restituisce 400 se la generazione non esiste" do
    patch rating_generated_data_path(99999), params: { rating: 3 }

    assert_response :bad_request
  end

  # === elimina /generated_data/:id ===

  test "destroy elimina la generazione e risponde con 200" do
    gen = GeneratedDatum.create!(
      company: @company, tone: @tone, style: @style,
      prompt: "Da eliminare", status: "completed"
    )

    assert_difference "GeneratedDatum.count", -1 do
      delete destroy_generated_data_path(gen.id)
    end

    assert_response :ok
    json = JSON.parse(response.body)
    assert json["message"].present?
  end

  test "destroy restituisce 422 se la generazione non esiste" do
    delete destroy_generated_data_path(99999)

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert json["error"].present?
  end
end
