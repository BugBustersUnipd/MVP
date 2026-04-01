require "test_helper"

class ImageGeneratorServiceTest < ActiveSupport::TestCase
  # Oggetto fittizio usato nel test.
  def mock_bedrock_success(image_base64)
    response_body = StringIO.new({
      images: [image_base64]
    }.to_json)
    
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| response }
    client
  end

  # Oggetto fittizio usato nel test.
  def mock_bedrock_alternative_format(image_base64, format_key = "image")
    response_body = StringIO.new({
      format_key => image_base64
    }.to_json)
    
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| response }
    client
  end

  # Crea un client Bedrock fittizio che solleva un errore.
  def failing_bedrock(error)
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| raise error }
    client
  end

  
  def bedrock_invalid_response
    response_body = StringIO.new({ somekey: "no_image_here" }.to_json)
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| response }
    client
  end

  # === CASO NORMALE ===
  test "genera immagine correttamente da Bedrock con formato 'images'" do
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success(base64_image))
    
    result = service.generate_image('{"taskType": "TEXT_IMAGE"}')
    
    assert_equal base64_image, result
  end

  test "estrae immagine quando Bedrock ritorna formato 'images' (array)" do
    base64 = "ABC123DEF456"
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success(base64))
    
    result = service.generate_image('{"taskType": "TEXT_IMAGE"}')
    
    assert_equal base64, result
  end

  # === FORMATI ALTERNATIVI ===
  test "supporta formato 'image' (singolo elemento)" do
    base64 = "XYZ789"
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_alternative_format(base64, "image"))
    
    result = service.generate_image('{"taskType": "TEXT_IMAGE"}')
    
    assert_equal base64, result
  end

  test "supporta formato 'image_base64'" do
    base64 = "QWERTY123"
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_alternative_format(base64, "image_base64"))
    
    result = service.generate_image('{"taskType": "TEXT_IMAGE"}')
    
    assert_equal base64, result
  end

  test "supporta formato 'imageUriBase64'" do
    base64 = "ASDFGH456"
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_alternative_format(base64, "imageUriBase64"))
    
    result = service.generate_image('{"taskType": "TEXT_IMAGE"}')
    
    assert_equal base64, result
  end

  # === EDGE CASES ===
  test "genera immagine da JSON multilinea" do
    json_prompt = %Q(
      {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
          "text": "Un paesaggio montagnoso"
        }
      }
    )
    base64 = "MULTILINE_IMAGE_BASE64"
    
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, mock_bedrock_success(base64))
    
    result = service.generate_image(json_prompt)
    
    assert_equal base64, result
  end

  # === GESTIONE ERRORI ===
  test "solleva ArgumentError per ValidationException" do
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, failing_bedrock(
      Aws::BedrockRuntime::Errors::ValidationException.new(nil, "Invalid dimensions")
    ))
    
    error = assert_raises(ArgumentError) do
      service.generate_image('{"width": 999}')
    end
    
    assert_includes error.message, "Parametri non validi per il modello"
  end

  test "propaga ServiceError da Bedrock" do
    skip "AWS SDK not available" unless defined?(Aws)
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, failing_bedrock(
      Aws::BedrockRuntime::Errors::ServiceError.new(nil, "InternalServerError")
    ))
    
    assert_raises(Aws::BedrockRuntime::Errors::ServiceError) do
      service.generate_image('{"taskType": "TEXT_IMAGE"}')
    end
  end

  test "solleva errore se risposta Bedrock non contiene immagine" do
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, bedrock_invalid_response)
    
    error = assert_raises(RuntimeError) do
      service.generate_image('{"taskType": "TEXT_IMAGE"}')
    end
    
    assert_includes error.message, "Nessuna immagine ritornata"
  end

  test "solleva errore se risposta Bedrock è JSON vuoto" do
    response_body = StringIO.new({}.to_json)
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| response }
    
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, client)
    
    error = assert_raises(RuntimeError) do
      service.generate_image('{"taskType": "TEXT_IMAGE"}')
    end
    
    assert_includes error.message, "Nessuna immagine ritornata"
  end

  test "solleva errore se 'images' array è vuoto" do
    response_body = StringIO.new({ images: [] }.to_json)
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) { |_args| response }
    
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, client)
    
    error = assert_raises(RuntimeError) do
      service.generate_image('{"taskType": "TEXT_IMAGE"}')
    end
    
    assert_includes error.message, "Nessuna immagine ritornata"
  end

  test "propaga errore se client Bedrock non è raggiungibile" do
    skip "AWS SDK not available" unless defined?(Aws)
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, failing_bedrock(Errno::ECONNREFUSED.new))
    
    assert_raises(Errno::ECONNREFUSED) do
      service.generate_image('{"taskType": "TEXT_IMAGE"}')
    end
  end

  # === PARAMETRI ===
  test "passa JSON corretto a invoke_model" do
    json_prompt = '{"taskType":"TEXT_IMAGE","textToImageParams":{"text":"test"}}'
    params_captured = {}
    
    response_body = StringIO.new({ images: ["BASE64"] }.to_json)
    response = Struct.new(:body).new(response_body)
    
    client = Object.new
    client.define_singleton_method(:invoke_model) do |args|
      params_captured = args
      response
    end
    
    service = AiGenerator::ImageGeneratorService.new(region: "us-east-1")
    service.instance_variable_set(:@client, client)
    
    service.generate_image(json_prompt)
    
    assert_equal json_prompt, params_captured[:body]
    assert_equal "application/json", params_captured[:content_type]
    assert_equal "application/json", params_captured[:accept]
  end

  test "usa la regione configurata" do
    service = AiGenerator::ImageGeneratorService.new(region: "eu-central-1")
    
    assert_equal "eu-central-1", service.instance_variable_get(:@region)
  end
end
