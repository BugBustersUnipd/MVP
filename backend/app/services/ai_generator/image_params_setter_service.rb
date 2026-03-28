module AiGenerator
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
    @errors << "prompt e company_id sono obbligatori" if @prompt.blank?

    is_valid = VALID_SIZES.any? { |s| s[:w] == @width && s[:h] == @height }

    unless is_valid
      allowed = VALID_SIZES.map { |s| "#{s[:w]}x#{s[:h]}" }.join(", ")
      @errors << "Dimensioni non supportate per Nova Canvas. Usa: #{allowed}"
    end

    @errors.empty?
  end

  def buildImagePrompt(aiTextGeneratorResponse)
    promptWithAITextGeneratorResponse = @prompt + ". Risposta alla domanda che può servire alla creazione dell'immagine: " + aiTextGeneratorResponse
    cutResponse = promptWithAITextGeneratorResponse.truncate(1000)
    {
      taskType: "TEXT_IMAGE",
      textToImageParams: {
        text: cutResponse,
        negativeText: "low quality, bad anatomy, distorted, watermark, text, signature, blur, grainy"
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: @height,
        width: @width,
        cfgScale: 7.0,
        seed: @seed
      }
    }.to_json
  end

  def getData
    {
      seed: @seed,
      width: @width,
      height: @height
    }
  end
end
end
