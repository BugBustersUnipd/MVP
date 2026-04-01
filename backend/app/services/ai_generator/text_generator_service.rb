module AiGenerator
class TextGeneratorService
  
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
  def generate_text(system_prompt, user_prompt)
    model_id = ::BEDROCK_CONFIG_GENERATION["model_id"]
    response = invokeBedrock(model_id, system_prompt, user_prompt)

    if response.stop_reason == "guardrail_intervened"
      raise Aws::BedrockRuntime::Errors::GuardrailException.new(nil, "Contenuto bloccato dai guardrails")
    end
    Rails.logger.info("Testo generato: #{response.output.message.content[0].text}")
    return response.output.message.content[0].text
  end

  private 

  # Invoca Bedrock per la generazione testo con guardrail configurati.
  def invokeBedrock(model_id, system_prompt, user_prompt, maxTokens = 1000, temperature = 0.7)
    messages = [{role: "user", content: [{ text: user_prompt }]}]
    @client.converse(
      model_id: model_id,
      messages: messages,
      system: [{ text: system_prompt }],
      inference_config: {max_tokens: maxTokens, temperature: temperature},
      guardrail_config: {
        guardrail_identifier: "gs9kmq0fkkzj",
        guardrail_version: "2"
      }
    )
  rescue Aws::BedrockRuntime::Errors::ServiceError => e
    raise expired_credentials_error(:bedrock, e) if expired_credentials_error?(e)

    Rails.logger.error("Bedrock API Error: #{e.code} - #{e.message}")
    raise
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
