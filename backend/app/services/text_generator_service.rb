class TextGeneratorService
  
  def initialize(region:)
    @region = region
    @client = Aws::BedrockRuntime::Client.new(
      access_key_id: ENV["AWS_ACCESS_KEY_ID"],
      secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"],
      session_token: ENV["AWS_SESSION_TOKEN"],
      region: @region
    )
  end

  def generate_text(system_prompt, user_prompt)
    # :: accede a costante globale caricata da bedrock.yml
    model_id = ::BEDROCK_CONFIG_GENERATION["model_id"]
    
    # Invoca Bedrock con fallback automatico per errori quota/regione
    response = invokeBedrock(model_id, system_prompt, user_prompt)

    if response.stop_reason == "guardrail_intervened"
      raise Aws::BedrockRuntime::Errors::GuardrailException.new(nil, "Contenuto bloccato dai guardrails")
    end
    
    # Estrae testo da risposta Bedrock
    # response.output.message.content = array di content blocks
    # [0] = primo block (text), .text = estrae stringa
    # Struttura: {output: {message: {content: [{text: "generated text"}]}}}
    Rails.logger.info("Testo generato: #{response.output.message.content[0].text}")
    return response.output.message.content[0].text
  end

  private 

  def invokeBedrock(model_id, system_prompt, user_prompt, maxTokens = 1000, temperature = 0.7)
    # @client.converse = chiamata HTTP POST a Bedrock Converse API
    # Sintassi Ruby: hash come ultimo parametro non richiede {}
    messages = [{role: "user", content: [{ text: user_prompt }]}]
    @client.converse(
      model_id: model_id,
      messages: messages,
      # system deve essere array di Hash con chiave text
      # [{text: "..."}] = array con un elemento Hash
      system: [{ text: system_prompt }],
      # inference_config = parametri generazione (temperature, tokens, etc.)
      inference_config: {max_tokens: maxTokens, temperature: temperature},
      guardrail_config: {
        guardrail_identifier: "gs9kmq0fkkzj",
        guardrail_version: "2"
      }
    )
  end
end