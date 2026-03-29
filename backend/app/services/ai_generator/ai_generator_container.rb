require_relative "ai_generator_service"
require_relative "ai_generator_data_manager"
require_relative "setter_factory"
require_relative "text_response_validator"
require_relative "text_generator_service"
require_relative "image_generator_service"

module AiGenerator
class AiGeneratorContainer
  REGION_FALLBACK = ENV.fetch("AWS_REGION", "us-east-1")

  def aiGeneratorService
    imgGenerator = self.imgGenerator
    textGenerator = self.textGenerator
    aiGeneratorDataManager = self.aiGeneratorDataManager
    setterFactory = self.setterFactory
    textResponseValidator = self.textResponseValidator
    @aiGeneratorService ||= AIGeneratorService.new(imgGenerator, textGenerator, aiGeneratorDataManager, setterFactory, textResponseValidator)
  end

  private

  def aiGeneratorDataManager
    @aiGeneratorDataManager ||= AIGeneratorDataManager.new
  end

  def setterFactory
    @setterFactory ||= SetterFactory.new
  end

  def textResponseValidator
    @textResponseValidator ||= TextResponseValidator.new
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
end
