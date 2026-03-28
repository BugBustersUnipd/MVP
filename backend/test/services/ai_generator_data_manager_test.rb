require "test_helper"

class AIGeneratorDataManagerTest < ActiveSupport::TestCase
  # === SETUP - CREA DATI DI TEST ===
  def setup
    @company = Company.create!(name: "Test Company", description: "A test company")
    @tone = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style = Style.create!(company: @company, name: "Modern", description: "Modern style")
    
    @generation_datum = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test prompt",
      status: "pending"
    )
  end

  # === FETCH METHODS ===
  test "fetchCompanyDescription ritorna descrizione azienda" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    description = manager.fetchCompanyDescription(@company.id)
    
    assert_equal "A test company", description
  end

  test "fetchToneDescription ritorna istruzioni tone" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    instructions = manager.fetchToneDescription(@tone.id)
    
    assert_equal "Be professional", instructions
  end

  test "fetchStyleDescription ritorna descrizione style" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    description = manager.fetchStyleDescription(@style.id)
    
    assert_equal "Modern style", description
  end

  test "fetchGenerationData ritorna il record GeneratedDatum" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    data = manager.fetchGenerationData(@generation_datum.id)
    
    assert_kind_of GeneratedDatum, data
    assert_equal @generation_datum.id, data.id
  end

  # === ERROR HANDLING FETCH ===
  test "fetchCompanyDescription solleva errore se azienda non esiste" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    assert_raises(ActiveRecord::RecordNotFound) do
      manager.fetchCompanyDescription(9999)
    end
  end

  test "fetchToneDescription ritorna nil se tone non esiste" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    result = manager.fetchToneDescription(9999)
    
    assert_nil result
  end

  test "fetchStyleDescription ritorna nil se style non esiste" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    result = manager.fetchStyleDescription(9999)
    
    assert_nil result
  end

  test "fetchGenerationData solleva errore se generazione non esiste" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    assert_raises(ActiveRecord::RecordNotFound) do
      manager.fetchGenerationData(9999)
    end
  end

  # === SAVE CONTENT ===
  test "saveContent aggiorna il record con testo e titolo" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    response_data = {
      image: nil,
      title: "Generated Title",
      text: "Generated content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: 2.5,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_equal "Generated Title", result.title
    assert_equal "Generated content", result.text_result
    assert_equal "completed", result.status
  end

  test "saveContent salva larghezza, altezza e seed" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    response_data = {
      image: nil,
      title: "Title",
      text: "Content",
      width: 1280,
      height: 720,
      seed: 42,
      responseTime: 1.5,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_equal 1280, result.width
    assert_equal 720, result.height
    assert_equal "42", result.seed
  end

  test "saveContent aggiorna data_time e generation_time" do
    manager = AiGenerator::AIGeneratorDataManager.new
    now = Time.now
    
    response_data = {
      image: nil,
      title: "Title",
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: 3.0,
      dateTime: now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_equal now.to_i, result.data_time.to_i
    assert_equal 3.0, result.generation_time
  end

  test "saveContent imposta status a 'completed'" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    response_data = {
      image: nil,
      title: "Title",
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    # Prima il status è pending
    assert_equal "pending", @generation_datum.status
    
    manager.saveContent(@generation_datum.id, response_data)
    @generation_datum.reload
    
    assert_equal "completed", @generation_datum.status
  end

  # === IMAGE HANDLING ===
  test "saveContent salva immagine base64 come file allegato" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    # PNG 1x1 pixel rosso
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    response_data = {
      image: base64_image,
      title: "Title",
      text: "Content",
      width: 1024,
      height: 1024,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert result.generated_image.attached?
  end

  test "saveContent gestisce immagine con data URI prefix" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    base64_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    response_data = {
      image: base64_image,
      title: "Title",
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert result.generated_image.attached?
  end

  test "saveContent non salva immagine se nil" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    # Assicurati che non c'è immagine inizialmente
    @generation_datum.reload
    assert_not @generation_datum.generated_image.attached?
    
    response_data = {
      image: nil,
      title: "Title",
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_not result.generated_image.attached?
  end

  test "saveContent non salva immagine se stringa vuota" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    response_data = {
      image: "",
      title: "Title",
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_not result.generated_image.attached?
  end

  # === EDGE CASES ===
  test "saveContent con testo molto lungo" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    long_text = "a" * 10000
    
    response_data = {
      image: nil,
      title: "Title",
      text: long_text,
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_equal long_text, result.text_result
  end

  test "saveContent con titolo molto lungo" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    long_title = "T" * 500
    
    response_data = {
      image: nil,
      title: long_title,
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_equal long_title, result.title
  end

  test "saveContent con caratteri speciali e unicode" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    response_data = {
      image: nil,
      title: "Titolo 中文 con émojis 🎨",
      text: "Contenuto Ñoé con special chars !@#$%",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_equal "Titolo 中文 con émojis 🎨", result.title
    assert_equal "Contenuto Ñoé con special chars !@#$%", result.text_result
  end

  test "saveContent ritorna l'oggetto aggiornato" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    response_data = {
      image: nil,
      title: "New Title",
      text: "New content",
      width: 720,
      height: 1280,
      seed: 99,
      responseTime: 2.0,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    assert_kind_of GeneratedDatum, result
    assert_equal @generation_datum.id, result.id
  end

  # === FILENAME IMAGE ===
  test "saveContent assegna filename corretto all'immagine" do
    manager = AiGenerator::AIGeneratorDataManager.new
    
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    response_data = {
      image: base64_image,
      title: "Title",
      text: "Content",
      width: nil,
      height: nil,
      seed: nil,
      responseTime: nil,
      dateTime: Time.now
    }
    
    result = manager.saveContent(@generation_datum.id, response_data)
    
    expected_filename = "ai_result_#{@generation_datum.id}.png"
    assert_equal expected_filename, result.generated_image.filename.to_s
  end
end
