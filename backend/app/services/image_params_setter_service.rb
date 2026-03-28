class ImageParamsSetterService

  def initialize(paramsData)
    prompt = paramsData[:prompt]
    @prompt = prompt.to_s.strip if prompt

    @height = paramsData[:height].present? ? paramsData[:height].to_i : 1024

    @width = paramsData[:width].present? ? paramsData[:width].to_i : 1024

    @seed = paramsData[:seed].present? ? paramsData[:seed].to_i : rand(0..2_147_483_647)

    @errors = []
  end

  VALID_SIZES = [
    { w: 1024, h: 1024 },
    { w: 1280, h: 720 },
    { w: 720, h: 1280 }
  ].freeze

  def valid?
    @errors << "prompt e company_id sono obbligatori" if @prompt.blank? #|| company_id.blank? company_id da dove?

    # Valida che dimensioni fornite siano supportate da Nova Canvas
    is_valid = VALID_SIZES.any? { |s| s[:w] == @width && s[:h] == @height }

    unless is_valid
      allowed = VALID_SIZES.map { |s| "#{s[:w]}x#{s[:h]}" }.join(", ")
      @errors << "Dimensioni non supportate per Nova Canvas. Usa: #{allowed}"
    end

    @errors.empty?
  end

  def buildImagePrompt(aiTextGeneratorResponse)
    promptWithAITextGeneratorResponse = @prompt + ". Risposta alla domanda che può servire alla creazione dell'immagine: " + aiTextGeneratorResponse
    cutResponse = promptWithAITextGeneratorResponse.truncate(1000) # Nova Canvas ha un limite di 1024 caratteri per il prompt, teniamo un margine per sicurezza
    {
      # Symbol keys vengono serializzate come string keys in JSON
      taskType: "TEXT_IMAGE",
      textToImageParams: {
        text: cutResponse,
        # negativeText = prompt negativo per filtrare elementi indesiderati
        negativeText: "low quality, bad anatomy, distorted, watermark, text, signature, blur, grainy"
      },
      imageGenerationConfig: {
        numberOfImages: 1,  # Nova supporta max 5, ma usiamo 1 per costi
        height: @height,
        width: @width,
        # cfgScale (Classifier-Free Guidance): quanto aderire al prompt
        # 1.0 = ignora prompt (casuale), 20.0 = segui letteralmente
        # 7.0 = compromesso qualità/creatività (valore raccomandato AWS)
        cfgScale: 7.0,
        seed: @seed
      }
    }.to_json
  end

  def getData
    {
      #prompt: @prompt,
      #company_id: @company_id,
      seed: @seed,
      width: @width,
      height: @height
    }
  end
end