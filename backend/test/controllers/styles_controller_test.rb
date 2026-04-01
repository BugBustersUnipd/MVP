require "test_helper"

class StylesControllerTest < ActionDispatch::IntegrationTest
  def setup
    @company = Company.create!(name: "Styles Corp", description: "Azienda di test")
    @other   = Company.create!(name: "Other Corp",  description: "Altra azienda")
  end

  # ---------------------------------------------------------------------------
  # GET /styles
  # ---------------------------------------------------------------------------

  test "index restituisce gli stili dell'azienda" do
    Style.create!(company: @company, name: "Conciso",    description: "Testo breve",   is_active: true)
    Style.create!(company: @company, name: "Dettagliato", description: "Testo lungo",  is_active: true)
    Style.create!(company: @other,   name: "Altro",       description: "Altro stile",  is_active: true)

    get styles_path, params: { company_id: @company.id }

    assert_response :ok
    json = JSON.parse(response.body)
    names = json["styles"].map { |s| s["name"] }
    assert_includes names, "Conciso"
    assert_includes names, "Dettagliato"
    assert_not_includes names, "Altro"
  end

  test "index restituisce solo stili attivi con filtro is_active=true" do
    Style.create!(company: @company, name: "Attivo",   description: "Attivo",   is_active: true)
    Style.create!(company: @company, name: "Inattivo", description: "Inattivo", is_active: false)

    get styles_path, params: { company_id: @company.id, is_active: "true" }

    assert_response :ok
    json = JSON.parse(response.body)
    names = json["styles"].map { |s| s["name"] }
    assert_includes     names, "Attivo"
    assert_not_includes names, "Inattivo"
  end

  test "index restituisce anche stili inattivi senza filtro" do
    Style.create!(company: @company, name: "Attivo",   description: "Attivo",   is_active: true)
    Style.create!(company: @company, name: "Inattivo", description: "Inattivo", is_active: false)

    get styles_path, params: { company_id: @company.id }

    assert_response :ok
    json  = JSON.parse(response.body)
    names = json["styles"].map { |s| s["name"] }
    assert_includes names, "Attivo"
    assert_includes names, "Inattivo"
  end

  test "index restituisce 400 se company_id mancante" do
    get styles_path

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "index restituisce 404 se l'azienda non esiste" do
    get styles_path, params: { company_id: 0 }

    assert_response :not_found
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "index restituisce array vuoto se l'azienda non ha stili" do
    get styles_path, params: { company_id: @company.id }

    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal [], json["styles"]
  end

  # ---------------------------------------------------------------------------
  # POST /styles
  # ---------------------------------------------------------------------------

  test "create crea uno stile e risponde con 200" do
    assert_difference "Style.count", 1 do
      post create_style_path, params: {
        style: { name: "Minimalista", description: "Testo essenziale", company_id: @company.id, is_active: true }
      }
    end

    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal "Minimalista", json["name"]
    assert json["id"].present?
  end

  test "create restituisce i campi corretti" do
    post create_style_path, params: {
      style: { name: "Formale", description: "Tono formale", company_id: @company.id, is_active: true }
    }

    json = JSON.parse(response.body)
    assert_equal "Formale",     json["name"]
    assert_equal "Tono formale", json["description"]
    assert_equal true,           json["is_active"]
  end

  test "create restituisce 400 se il nome manca" do
    assert_no_difference "Style.count" do
      post create_style_path, params: {
        style: { name: "", description: "Descrizione", company_id: @company.id }
      }
    end

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "create restituisce 400 se la descrizione manca" do
    assert_no_difference "Style.count" do
      post create_style_path, params: {
        style: { name: "Nuovo", description: "", company_id: @company.id }
      }
    end

    assert_response :bad_request
  end

  # ---------------------------------------------------------------------------
  # DELETE /styles/:id
  # ---------------------------------------------------------------------------

  test "destroy disattiva uno stile attivo" do
    style = Style.create!(company: @company, name: "Da eliminare", description: "X", is_active: true)

    delete destroy_style_path(id: style.id)

    assert_response :ok
    json = JSON.parse(response.body)
    assert json["message"].present?
    assert_equal false, style.reload.is_active
  end

  test "destroy restituisce 400 se lo stile è già inattivo" do
    style = Style.create!(company: @company, name: "Già inattivo", description: "X", is_active: false)

    delete destroy_style_path(id: style.id)

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "destroy restituisce 400 se l'id non esiste" do
    delete destroy_style_path(id: 0)

    assert_response :bad_request
  end
end
