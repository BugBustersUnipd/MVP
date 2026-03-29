require "test_helper"
require_relative "../../app/services/ai_generator/ai_generator_service"
require_relative "../../app/services/ai_generator/ai_generator_data_manager"
require_relative "../../app/services/ai_generator/setter_factory"

class AIGeneratorServiceTest < ActiveSupport::TestCase
  def setup
    @company = Company.create!(name: "Test Corp")
    @tone = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style = Style.create!(company: @company, name: "Modern", description: "Modern style")
    
    @generation_datum = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Scrivi un'email",
      status: "pending"
    )
  end

  def mock_bedrock_text(response_text)
    content_item = Struct.new(:text).new(response_text)
    message = Struct.new(:content).new([content_item])
    output = Struct.new(:message).new(message)
    response = Struct.new(:output, :stop_reason).new(output, "end_turn")
    
    client = Object.new
    client.define_singleton_method(:converse) { |_args| response }
    client
  end

  def mock_bedrock_image(base64_image)
    response_body = StringIO.new({ images: [base64_image] }.to_json)
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| response }
    client
  end

  def create_service(text_gen_client = nil, img_gen_client = nil)
    text_gen = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    text_gen_client && text_gen.instance_variable_set(:@client, text_gen_client)
    
    img_gen = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    img_gen_client && img_gen.instance_variable_set(:@client, img_gen_client)
    
    data_manager = AiGenerator::AIGeneratorDataManager.new
    factory = AiGenerator::SetterFactory.new
    text_response_validator = AiGenerator::TextResponseValidator.new
    
    AiGenerator::AIGeneratorService.new(img_gen, text_gen, data_manager, factory, text_response_validator)
  end

  # === CASE NORMALE ===
  test "crea contenuto con testo e immagine" do
    text_response = "Titolo Email | Caro cliente,\n\nLe scrivo per..."
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_equal "Titolo Email", @generation_datum.title
    assert_equal "Caro cliente,\n\nLe scrivo per...", @generation_datum.text_result
    assert @generation_datum.generated_image.attached?
  end

  test "splitter testo in titolo e contenuto con doppio pipe" do
    text_response = "Titolo | Contenuto della mail"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_equal "Titolo", @generation_datum.title
    assert_equal "Contenuto della mail", @generation_datum.text_result
  end

  test "splitter testo con titolo multilinea" do
    text_response = "Titolo Email | Riga 1\nRiga 2\nRiga 3"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_equal "Titolo Email", @generation_datum.title
    assert_includes @generation_datum.text_result, "Riga 1"
    assert_includes @generation_datum.text_result, "Riga 2"
  end

  # === EDGE CASES - PARSING TITOLO ===
  test "usa default titolo se LLM non usa format pipe" do
    text_response = "Contenuto senza titolo"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_includes @generation_datum.title, "Generazione"
    assert_equal "Contenuto senza titolo", @generation_datum.text_result
  end

  test "usa default titolo se pipe present ma formato strano" do
    text_response = "|"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    # Dovrebbe usare un titolo default
    assert_not_nil @generation_datum.title
  end

  test "gestisce tante pipe nel testo" do
    # "Titolo | Parte1 | Parte2 | Parte3"
    text_response = "Titolo | Parte1 | Parte2 | Parte3"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_equal "Titolo", @generation_datum.title
    assert_includes @generation_datum.text_result, "Parte1"
    assert_includes @generation_datum.text_result, "Parte2"
    assert_includes @generation_datum.text_result, "Parte3"
  end

  # === SALVATAGGIO DATI ===
  test "salva width, height e seed generati" do
    text_response = "Titolo | Contenuto"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    # AiGenerator::ImageParamsSetterService usa default 1024x1024
    assert_equal 1024, @generation_datum.width
    assert_equal 1024, @generation_datum.height
    assert_not_nil @generation_datum.seed
  end

  test "salva timestamp della generazione" do
    text_response = "Titolo | Contenuto"
    base64_image = "ABC123"
    
    time_before = Time.current
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_not_nil @generation_datum.data_time
    assert @generation_datum.data_time >= time_before
  end

  # === VALIDAZIONI ===
  test "chiama valid? su entrambi i setter" do
    text_response = "Titolo | Contenuto"
    base64_image = "ABC123"
    
    text_gen_called = false
    img_gen_called = false
    
    text_gen = Object.new
    text_gen.define_singleton_method(:generate_text) { |_system_prompt, _user_prompt| text_response }
    
    img_gen = Object.new
    img_gen.define_singleton_method(:generate_image) { |_image_prompt| base64_image }
    
    data_manager = AiGenerator::AIGeneratorDataManager.new
    
    factory = Object.new
    factory.define_singleton_method(:create_text_setter) do |params|
      setter = AiGenerator::TextParamsSetterService.new(params)
      text_gen_called = true
      setter
    end
    
    factory.define_singleton_method(:create_image_setter) do |params|
      setter = AiGenerator::ImageParamsSetterService.new(params)
      img_gen_called = true
      setter
    end
    
    service = AiGenerator::AIGeneratorService.new(
      img_gen,
      text_gen,
      data_manager,
      factory,
      AiGenerator::TextResponseValidator.new
    )
    
    service.create_content(@generation_datum.id)
    
    # I factory dovrebbero essere stati chiamati
    assert text_gen_called
    assert img_gen_called
  end

  # === EDGE CASES - TESTO VUOTO ===
  test "gestisce testo generato vuoto" do
    text_response = ""
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    # Ha comunque un titolo e uno spazio per il testo
    assert_not_nil @generation_datum.title
  end

  # === EDGE CASES - SPECIAL CHARS ===
  test "gestisce testo con caratteri speciali e unicode" do
    text_response = "Titolo 中文 | Contenuto Ñoé con émojis 🎨"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert_equal "Titolo 中文", @generation_datum.title
    assert_includes @generation_datum.text_result, "Ñoé"
    assert_includes @generation_datum.text_result, "🎨"
  end

  # === SALVATAGGIO IMMAGINE ===
  test "salva immagine generata come allegato" do
    text_response = "Titolo | Contenuto"
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    assert @generation_datum.generated_image.attached?
  end

  # === CASE SENZA PIPE ===
  test "fallback quando singolo pipe" do
    text_response = "Solo testo di ritorno|senza gestione pipe"
    base64_image = "ABC123"
    
    service = create_service(
      mock_bedrock_text(text_response),
      mock_bedrock_image(base64_image)
    )
    
    service.create_content(@generation_datum.id)
    
    @generation_datum.reload
    
    # Dovrebbe split su pipe
    assert @generation_datum.title.present?
    assert @generation_datum.text_result.present?
  end

  test "solleva BlockedResponseError quando il testo contiene messaggio bloccante" do
    blocked_text = "Siamo spiacenti, la domanda non rispetta le linee guida."

    text_gen = Object.new
    text_gen.define_singleton_method(:generate_text) { |_system_prompt, _user_prompt| blocked_text }

    img_gen = Object.new
    img_gen.define_singleton_method(:generate_image) do |_image_prompt|
      raise "generate_image non dovrebbe essere chiamato per risposta bloccata"
    end

    service = AiGenerator::AIGeneratorService.new(
      img_gen,
      text_gen,
      AiGenerator::AIGeneratorDataManager.new,
      AiGenerator::SetterFactory.new,
      AiGenerator::TextResponseValidator.new
    )

    error = assert_raises(AiGenerator::AIGeneratorService::BlockedResponseError) do
      service.create_content(@generation_datum.id)
    end

    assert_equal blocked_text, error.message
  end
end
