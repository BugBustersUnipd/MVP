require "aws-sdk-bedrockruntime"
require "json"

class ImageGeneratorService

  def initialize(region:)
    @region = region
    @client = Aws::BedrockRuntime::Client.new(
      access_key_id: ENV["AWS_ACCESS_KEY_ID"],
      secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"],
      session_token: ENV["AWS_SESSION_TOKEN"],
      region: @region
    )
  end

  def generate_image(image_prompt_json)
    model_id = ::BEDROCK_CONFIG_IMAGE_GENERATION["model_id"]
    
    response = invokeNovaCanvas(model_id, image_prompt_json)

    extract_image_data(response)
  end

  private
  
  def invokeNovaCanvas(model_id, image_prompt_json)
    @client.invoke_model(
      model_id: model_id,
      body: image_prompt_json,  # JSON string da buildImagePrompt
      content_type: "application/json",
      accept: "application/json"
    )
    
  rescue Aws::BedrockRuntime::Errors::ValidationException => e
    Rails.logger.error("Errore validazione parametri Nova: #{e.message}")
    
    raise ArgumentError, "Parametri non validi per il modello (controlla dimensioni/seed)"
    
  rescue Aws::BedrockRuntime::Errors::ServiceError => e
    Rails.logger.error("Bedrock API Error: #{e.code} - #{e.message}")
    raise
  end

  def extract_image_data(response)
    # response.body = StringIO (oggetto simile a file)
    # .read = legge tutto contenuto come stringa
    # JSON.parse = converte JSON string in Hash Ruby
    payload = JSON.parse(response.body.read)

    # Log chiavi presenti per debug (utile se Nova cambia formato ancora)
    # payload.keys = array chiavi Hash
    # .join(', ') = unisce array in stringa separata da virgole
    Rails.logger.info("Nova Canvas Response keys: #{payload.keys.join(', ')}")

    # Prova chiave "images" (array di stringhe base64)
    # &. = safe navigation operator (evita errore se payload["images"] è nil)
    # .any? = true se array ha almeno un elemento
    if payload["images"]&.any?
      # .first = primo elemento array
      payload["images"].first
      
    # Prova chiave "image" (singola stringa base64)
    elsif payload["image"]
      payload["image"]
      
    # Prova chiave "image_base64"
    elsif payload["image_base64"]
      payload["image_base64"]
      
    # Prova chiave "imageUriBase64"
    elsif payload["imageUriBase64"]
      payload["imageUriBase64"]
      
    # Nessuna chiave trovata: errore
    else
      # .inspect = rappresentazione debug dell'oggetto (mostra tutta struttura)
      Rails.logger.error("Nova Canvas: Response non contenente immagine. Payload completo: #{payload.inspect}")
      
      # raise String = solleva RuntimeError con messaggio
      # Include chiavi presenti per facilitare debug
      raise "Errore Nova Canvas: Nessuna immagine ritornata. Payload keys: #{payload.keys.join(', ')}"
    end
  end

end