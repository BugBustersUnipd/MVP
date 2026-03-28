class AIGeneratorContainer
  REGION_FALLBACK = ENV.fetch("AWS_REGION", "us-east-1")

  def aiGeneratorService
    imgGenerator = self.imgGenerator
    textGenerator = self.textGenerator
    aiGeneratorDataManager = self.aiGeneratorDataManager
    setterFactory = self.setterFactory
    @aiGeneratorService ||= AIGeneratorService.new(imgGenerator, textGenerator, aiGeneratorDataManager, setterFactory)
  end

  private

  def aiGeneratorDataManager
    @aiGeneratorDataManager ||= AIGeneratorDataManager.new
  end

  def setterFactory
    @setterFactory ||= SetterFactory.new
  end

  def textGenerator
    @textGenerator ||= TextGeneratorService.new(region: text_generation_region)
  end

  def imgGenerator
    @imgGenerator ||= ImageGeneratorService.new(region: image_generation_region)
  end

  def text_generation_region
    ::BEDROCK_CONFIG_GENERATION["region"] || REGION_FALLBACK
  end

  def image_generation_region
    ::BEDROCK_CONFIG_IMAGE_GENERATION["region"] || REGION_FALLBACK
  end
end