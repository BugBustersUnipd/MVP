require_relative "ai_generator_service"
require_relative "ai_generator_data_manager"
require_relative "setter_factory"
require_relative "text_response_validator"
require_relative "text_generator_service"
require_relative "image_generator_service"

module AiGenerator
class AiGeneratorContainer
  REGION_FALLBACK = ENV.fetch("AWS_REGION", "us-east-1")

  # Costruisce il servizio principale di generazione con tutte le dipendenze.
  def aiGeneratorService
    imgGenerator = self.imgGenerator
    textGenerator = self.textGenerator
    aiGeneratorDataManager = self.aiGeneratorDataManager
    setterFactory = self.setterFactory
    textResponseValidator = self.textResponseValidator
    @aiGeneratorService ||= AIGeneratorService.new(imgGenerator, textGenerator, aiGeneratorDataManager, setterFactory, textResponseValidator)
  end

  private

  # Restituisce il data manager per recupero/salvataggio dati di generazione.
  def aiGeneratorDataManager
    @aiGeneratorDataManager ||= AIGeneratorDataManager.new
  end

  # Restituisce la factory dei setter testo/immagine.
  def setterFactory
    @setterFactory ||= SetterFactory.new
  end

  # Restituisce il validatore della risposta testuale generata.
  def textResponseValidator
    @textResponseValidator ||= TextResponseValidator.new
  end

  # Restituisce il servizio per la generazione del testo.
  def textGenerator
    @textGenerator ||= TextGeneratorService.new(region: text_generation_region)
  end

  # Restituisce il servizio per la generazione dell'immagine.
  def imgGenerator
    @imgGenerator ||= ImageGeneratorService.new(region: image_generation_region)
  end

  # Legge la regione Bedrock per la generazione testo con fallback.
  def text_generation_region
    ::BEDROCK_CONFIG_GENERATION["region"] || REGION_FALLBACK
  end

  # Legge la regione Bedrock per la generazione immagine con fallback.
  def image_generation_region
    ::BEDROCK_CONFIG_IMAGE_GENERATION["region"] || REGION_FALLBACK
  end
end
end
