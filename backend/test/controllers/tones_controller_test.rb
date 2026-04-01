require "test_helper"

class TonesControllerTest < ActionDispatch::IntegrationTest
  # Preparazione dati di test.
  def setup
    @company = Company.create!(name: "Tones Corp", description: "Azienda di test")
    @other   = Company.create!(name: "Other Corp",  description: "Altra azienda")
  end

  # ---------------------------------------------------------------------------
  # GET /tones
  # ---------------------------------------------------------------------------

  test "index restituisce i toni dell'azienda" do
    Tone.create!(company: @company, name: "Professionale", description: "Tono serio",    is_active: true)
    Tone.create!(company: @company, name: "Amichevole",    description: "Tono friendly", is_active: true)
    Tone.create!(company: @other,   name: "Altro",         description: "Altro tono",    is_active: true)

    get tones_path, params: { company_id: @company.id }

    assert_response :ok
    json  = JSON.parse(response.body)
    names = json["tones"].map { |t| t["name"] }
    assert_includes     names, "Professionale"
    assert_includes     names, "Amichevole"
    assert_not_includes names, "Altro"
  end

  test "index restituisce solo toni attivi con filtro is_active=true" do
    Tone.create!(company: @company, name: "Attivo",   description: "Attivo",   is_active: true)
    Tone.create!(company: @company, name: "Inattivo", description: "Inattivo", is_active: false)

    get tones_path, params: { company_id: @company.id, is_active: "true" }

    assert_response :ok
    json  = JSON.parse(response.body)
    names = json["tones"].map { |t| t["name"] }
    assert_includes     names, "Attivo"
    assert_not_includes names, "Inattivo"
  end

  test "index restituisce anche toni inattivi senza filtro" do
    Tone.create!(company: @company, name: "Attivo",   description: "Attivo",   is_active: true)
    Tone.create!(company: @company, name: "Inattivo", description: "Inattivo", is_active: false)

    get tones_path, params: { company_id: @company.id }

    assert_response :ok
    json  = JSON.parse(response.body)
    names = json["tones"].map { |t| t["name"] }
    assert_includes names, "Attivo"
    assert_includes names, "Inattivo"
  end

  test "index restituisce 400 se company_id mancante" do
    get tones_path

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "index restituisce 404 se l'azienda non esiste" do
    get tones_path, params: { company_id: 0 }

    assert_response :not_found
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "index restituisce array vuoto se l'azienda non ha toni" do
    get tones_path, params: { company_id: @company.id }

    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal [], json["tones"]
  end

  # ---------------------------------------------------------------------------
  # POST /tones
  # ---------------------------------------------------------------------------

  test "create crea un tono e risponde con 200" do
    assert_difference "Tone.count", 1 do
      post create_tone_path, params: {
        tone: { name: "Ironico", description: "Tono ironico", company_id: @company.id, is_active: true }
      }
    end

    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal "Ironico", json["name"]
    assert json["id"].present?
  end

  test "create restituisce i campi corretti" do
    post create_tone_path, params: {
      tone: { name: "Neutro", description: "Tono neutro", company_id: @company.id, is_active: true }
    }

    json = JSON.parse(response.body)
    assert_equal "Neutro",     json["name"]
    assert_equal "Tono neutro", json["description"]
    assert_equal true,          json["is_active"]
  end

  test "create restituisce 400 se il nome manca" do
    assert_no_difference "Tone.count" do
      post create_tone_path, params: {
        tone: { name: "", description: "Descrizione", company_id: @company.id }
      }
    end

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "create restituisce 400 se la descrizione manca" do
    assert_no_difference "Tone.count" do
      post create_tone_path, params: {
        tone: { name: "Nuovo", description: "", company_id: @company.id }
      }
    end

    assert_response :bad_request
  end

  # ---------------------------------------------------------------------------
  # elimina /tones/:id
  # ---------------------------------------------------------------------------

  test "destroy disattiva un tono attivo" do
    tone = Tone.create!(company: @company, name: "Da eliminare", description: "X", is_active: true)

    delete destroy_tone_path(id: tone.id)

    assert_response :ok
    json = JSON.parse(response.body)
    assert json["message"].present?
    assert_equal false, tone.reload.is_active
  end

  test "destroy restituisce 400 se il tono è già inattivo" do
    tone = Tone.create!(company: @company, name: "Già inattivo", description: "X", is_active: false)

    delete destroy_tone_path(id: tone.id)

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "destroy restituisce 400 se l'id non esiste" do
    delete destroy_tone_path(id: 0)

    assert_response :bad_request
  end
end
