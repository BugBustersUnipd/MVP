require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  # Preparazione dati di test.
  def setup
    Post.delete_all

    @company = Company.create!(name: "Post Corp", description: "Azienda di test")
    @tone    = Tone.create!(company: @company, name: "Professionale", description: "Tono serio")
    @style   = Style.create!(company: @company, name: "Conciso", description: "Testo breve")

    @generation = GeneratedDatum.create!(
      company:     @company,
      tone:        @tone,
      style:       @style,
      prompt:      "Scrivi un post",
      status:      "completed",
      title:       "Titolo generato",
      text_result: "Testo generato"
    )
  end

  # ---------------------------------------------------------------------------
  # GET /posts
  # ---------------------------------------------------------------------------

  test "index risponde con 200" do
    get posts_path
    assert_response :ok
  end

  test "index restituisce la chiave posts" do
    get posts_path
    json = JSON.parse(response.body)
    assert json.key?("posts")
    assert_kind_of Array, json["posts"]
  end

  test "index restituisce i post creati" do
    Post.create!(generated_datum: @generation, title: "Post A", body_text: "Testo A", date_time: Time.current)
    Post.create!(
      generated_datum: GeneratedDatum.create!(
        company: @company, tone: @tone, style: @style,
        prompt: "Altro prompt", status: "completed",
        title: "Altro titolo", text_result: "Altro testo"
      ),
      title: "Post B", body_text: "Testo B", date_time: 1.day.ago
    )

    get posts_path

    json   = JSON.parse(response.body)
    titles = json["posts"].map { |p| p["title"] }
    assert_includes titles, "Post A"
    assert_includes titles, "Post B"
  end

  test "index restituisce i post in ordine decrescente per data" do
    older = Post.create!(generated_datum: @generation, title: "Vecchio", body_text: "X", date_time: 2.days.ago)
    newer_gen = GeneratedDatum.create!(
      company: @company, tone: @tone, style: @style,
      prompt: "Nuovo", status: "completed", title: "T", text_result: "X"
    )
    newer = Post.create!(generated_datum: newer_gen, title: "Nuovo", body_text: "Y", date_time: Time.current)

    get posts_path

    json   = JSON.parse(response.body)
    titles = json["posts"].map { |p| p["title"] }
    assert titles.index("Nuovo") < titles.index("Vecchio")
  end

  test "index restituisce array vuoto se non ci sono post" do
    get posts_path
    json = JSON.parse(response.body)
    assert_equal [], json["posts"]
  end

  # ---------------------------------------------------------------------------
  # POST /posts
  # ---------------------------------------------------------------------------

  test "create crea un post a partire da una generazione" do
    assert_difference "Post.count", 1 do
      post create_post_path, params: { generated_datum_id: @generation.id }
    end

    assert_response :ok
    json = JSON.parse(response.body)
    assert json["id"].present?
    assert_equal "Post creato con successo!", json["message"]
  end

  test "create usa title e body_text della generazione se non forniti" do
    post create_post_path, params: { generated_datum_id: @generation.id }

    created = Post.find(JSON.parse(response.body)["id"])
    assert_equal @generation.title,       created.title
    assert_equal @generation.text_result, created.body_text
  end

  test "create usa title e body_text passati se forniti" do
    post create_post_path, params: {
      generated_datum_id: @generation.id,
      title:     "Titolo custom",
      body_text: "Testo custom"
    }

    created = Post.find(JSON.parse(response.body)["id"])
    assert_equal "Titolo custom", created.title
    assert_equal "Testo custom",  created.body_text
  end

  test "create restituisce 422 se generated_datum_id mancante" do
    assert_no_difference "Post.count" do
      post create_post_path, params: {}
    end

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "create restituisce 422 se la generazione non esiste" do
    assert_no_difference "Post.count" do
      post create_post_path, params: { generated_datum_id: 0 }
    end

    assert_response :unprocessable_entity
  end

  test "create restituisce 422 se esiste già un post per quella generazione" do
    Post.create!(generated_datum: @generation, title: "Esistente", body_text: "X", date_time: Time.current)

    assert_no_difference "Post.count" do
      post create_post_path, params: { generated_datum_id: @generation.id }
    end

    assert_response :unprocessable_entity
  end

  # ---------------------------------------------------------------------------
  # elimina /posts/:id
  # ---------------------------------------------------------------------------

  test "destroy elimina un post esistente" do
    p = Post.create!(generated_datum: @generation, title: "Da eliminare", body_text: "X", date_time: Time.current)

    assert_difference "Post.count", -1 do
      delete destroy_post_path(id: p.id)
    end

    assert_response :ok
    json = JSON.parse(response.body)
    assert json["message"].present?
  end

  test "destroy restituisce 400 se il post non esiste" do
    delete destroy_post_path(id: 0)

    assert_response :bad_request
    json = JSON.parse(response.body)
    assert json["error"].present?
  end
end
