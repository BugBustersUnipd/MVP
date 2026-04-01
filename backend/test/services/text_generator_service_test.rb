require "test_helper"

class TextGeneratorServiceTest < ActiveSupport::TestCase
  # Oggetto fittizio usato nel test.
  def mock_bedrock_success(response_text)
    content_item = Struct.new(:text).new(response_text)
    message = Struct.new(:content).new([content_item])
    output = Struct.new(:message).new(message)
    response = Struct.new(:output, :stop_reason).new(output, "end_turn")
    
    client = Object.new
    client.define_singleton_method(:converse) { |_args| response }
    client
  end

  # Oggetto fittizio usato nel test.
  def mock_bedrock_guardrail_blocked
    content_item = Struct.new(:text).new("Contenuto bloccato")
    message = Struct.new(:content).new([content_item])
    output = Struct.new(:message).new(message)
    response = Struct.new(:output, :stop_reason).new(output, "guardrail_intervened")
    
    client = Object.new
    client.define_singleton_method(:converse) { |_args| response }
    client
  end

  # Crea un client Bedrock fittizio che solleva un errore.
  def failing_bedrock(error)
    client = Object.new
    client.define_singleton_method(:converse) { |_args| raise error }
    client
  end

  # === CASO NORMALE ===
  test "genera testo correttamente da Bedrock" do
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success("Titolo | Contenuto generato"))
    
    result = service.generate_text("System prompt", "User prompt")
    
    assert_equal "Titolo | Contenuto generato", result
  end

  test "estrae solo il testo dalla risposta strutturata di Bedrock" do
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success("Testo puro"))
    
    result = service.generate_text("System", "User")
    
    assert_equal "Testo puro", result
  end

  # === EDGE CASES ===
  test "genera testo vuoto se Bedrock ritorna stringa vuota" do
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success(""))
    
    result = service.generate_text("System", "User")
    
    assert_equal "", result
  end

  test "gestisce testo multilinea da Bedrock" do
    multiline_text = "Titolo | Riga 1\nRiga 2\nRiga 3"
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success(multiline_text))
    
    result = service.generate_text("System", "User")
    
    assert_equal multiline_text, result
  end

  test "gestisce testo con caratteri speciali" do
    special_text = "Titolo | Testo con €, ñ, 中文, emoji 🚀"
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success(special_text))
    
    result = service.generate_text("System", "User")
    
    assert_equal special_text, result
  end

  # === GESTIONE ERRORI ===
  test "solleva eccezione se guardrail interviene" do
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_guardrail_blocked)
    
    error = assert_raises(Aws::BedrockRuntime::Errors::GuardrailException) do
      service.generate_text("System", "Prompt vietato")
    end
    
    assert_includes error.message, "Contenuto bloccato dai guardrails"
  end

  test "propaga eccezione se Bedrock genera errore di servizio" do
    skip "AWS SDK not available" unless defined?(Aws)
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, failing_bedrock(
      Aws::BedrockRuntime::Errors::ServiceError.new(nil, "ThrottlingException")
    ))
    
    assert_raises(Aws::BedrockRuntime::Errors::ServiceError) do
      service.generate_text("System", "User")
    end
  end

  test "propaga eccezione se client Bedrock non è raggiungibile" do
    skip "AWS SDK not available" unless defined?(Aws)
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, failing_bedrock(Errno::ECONNREFUSED.new))
    
    assert_raises(Errno::ECONNREFUSED) do
      service.generate_text("System", "User")
    end
  end

  # === PARAMETRI ===
  test "accetta system_prompt e user_prompt come parametri" do
    service = AiGenerator::TextGeneratorService.new(region: "us-east-1")
    
    # Oggetto fittizio usato nel test.
    params_captured = {}
    client = Object.new
    client.define_singleton_method(:converse) do |args|
      params_captured = args
      content_item = Struct.new(:text).new("test")
      message = Struct.new(:content).new([content_item])
      output = Struct.new(:message).new(message)
      Struct.new(:output, :stop_reason).new(output, "end_turn")
    end
    
    service.instance_variable_set(:@client, client)
    service.generate_text("Sei un esperto", "Genera un testo")
    
    assert_equal "Sei un esperto", params_captured[:system][0][:text]
    assert_equal "Genera un testo", params_captured[:messages][0][:content][0][:text]
  end

  test "usa la regione configurata" do
    service = AiGenerator::TextGeneratorService.new(region: "eu-west-1")
    
    assert_equal "eu-west-1", service.instance_variable_get(:@region)
  end
end
