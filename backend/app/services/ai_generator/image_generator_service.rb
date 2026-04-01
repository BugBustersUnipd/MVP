require "aws-sdk-bedrockruntime"
require "json"

module AiGenerator
class ImageGeneratorService

  # Inizializza le dipendenze del componente.
  def initialize(region:)
    @region = region
    @client = Aws::BedrockRuntime::Client.new(
      access_key_id: ENV["AWS_ACCESS_KEY_ID"],
      secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"],
      session_token: ENV["AWS_SESSION_TOKEN"],
      region: @region
    )
  end

  # Costruisce i dati di output per il flusso corrente.
  def generate_image(image_prompt_json)
    model_id = ::BEDROCK_CONFIG_IMAGE_GENERATION["model_id"]
    
    response = invokeNovaCanvas(model_id, image_prompt_json)

    extract_image_data(response)
  end

  private
  
  # Invoca Nova Canvas su Bedrock e restituisce la risposta raw del modello.
  def invokeNovaCanvas(model_id, image_prompt_json)
    @client.invoke_model(
      model_id: model_id,
      body: image_prompt_json,
      content_type: "application/json",
      accept: "application/json"
    )
    
  rescue Aws::BedrockRuntime::Errors::ValidationException => e
    Rails.logger.error("Errore validazione parametri Nova: #{e.message}")
    
    raise ArgumentError, "Parametri non validi per il modello (controlla dimensioni/seed)"
    
  rescue Aws::BedrockRuntime::Errors::ServiceError => e
    raise expired_credentials_error(:bedrock, e) if expired_credentials_error?(e)

    Rails.logger.error("Bedrock API Error: #{e.code} - #{e.message}")
    raise
  end

  # Estrae e prepara i dati utili al processamento.
  def extract_image_data(response)
    payload = JSON.parse(response.body.read)

    Rails.logger.info("Nova Canvas Response keys: #{payload.keys.join(', ')}")

    if payload["images"]&.any?
      payload["images"].first
    elsif payload["image"]
      payload["image"]
    elsif payload["image_base64"]
      payload["image_base64"]
    elsif payload["imageUriBase64"]
      payload["imageUriBase64"]
    else
      Rails.logger.error("Nova Canvas: Response non contenente immagine. Payload completo: #{payload.inspect}")
      raise "Errore Nova Canvas: Nessuna immagine ritornata. Payload keys: #{payload.keys.join(', ')}"
    end
  end

  # Verifica le condizioni richieste prima di procedere.
  def expired_credentials_error?(error)
    message = error.message.to_s.downcase
    message.include?("security token") && message.include?("expired")
  end

  # Costruisce un errore esplicito quando le credenziali AWS risultano scadute.
  def expired_credentials_error(service, error)
    RuntimeError.new("Credenziali AWS scadute (#{service}): aggiorna AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN nel backend e riavvia il container. Dettaglio: #{error.message}")
  end

end
end
