require_relative "text_response_validator"

module AiGenerator
class AIGeneratorService
  BlockedResponseError = TextResponseValidator::BlockedResponseError
  InvalidSetterParamsError = Class.new(StandardError)

  # Inizializza le dipendenze del componente.
  def initialize(imgGenerator, textGenerator, aiGeneratorDataManager, setterFactory, textResponseValidator)
    @imgGenerator = imgGenerator
    @textGenerator = textGenerator
    @aiGeneratorDataManager = aiGeneratorDataManager
    @setterFactory = setterFactory
    @textResponseValidator = textResponseValidator
  end

  # Costruisce i dati di output per il flusso corrente.
  def create_content(generationID)
    generationData = @aiGeneratorDataManager.fetchGenerationData(generationID)
    toneDescription = @aiGeneratorDataManager.fetchToneDescription(generationData.tone_id)
    styleDescription = @aiGeneratorDataManager.fetchStyleDescription(generationData.style_id)
    companyDescription = @aiGeneratorDataManager.fetchCompanyDescription(generationData.company_id)
    company = Company.find_by(id: generationData.company_id)
    raise ActiveRecord::RecordNotFound, "Company #{generationData.company_id} non trovata" unless company
    companyName = company.name

    textSetter = @setterFactory.create_text_setter({
      prompt: generationData.prompt,
      toneDescription: toneDescription,
      styleDescription: styleDescription,
      companyName: companyName,
      companyDescription: companyDescription
    })
    imageSetter = @setterFactory.create_image_setter({
      prompt: generationData.prompt,
      width: nil,
      height: nil,
      seed: nil
    })

    validate_setters!(textSetter, imageSetter)

    textResult = createText(textSetter, generationData.prompt)
    parsed_text = @textResponseValidator.parse!(textResult, generationID)

    imageResult = createImage(imageSetter, textResult)

    otherImageInfos = imageSetter.getData
    if generationData.created_at
      response_time = (Time.current - generationData.created_at).to_f
    else
      response_time = 0
    end 

    @aiGeneratorDataManager.saveContent(generationID, {image: imageResult, title: parsed_text[:title], text: parsed_text[:text], width: otherImageInfos[:width], height: otherImageInfos[:height], seed: otherImageInfos[:seed], responseTime: response_time, dateTime: Time.now})
  end

  private

  # Verifica le condizioni richieste prima di procedere.
  def validate_setters!(textSetter, imageSetter)
    errors = []

    errors.concat(prefixed_errors("text", textSetter.getData[:errors])) unless textSetter.valid?
    errors.concat(prefixed_errors("image", imageSetter.getData[:errors])) unless imageSetter.valid?

    return if errors.empty?

    raise InvalidSetterParamsError, "Parametri non validi: #{errors.join(', ')}"
  end

  # Aggiunge un prefisso alla lista errori per distinguere il setter sorgente.
  def prefixed_errors(prefix, error_list)
    Array(error_list).map { |error| "#{prefix}: #{error}" }
  end

  # Costruisce i dati di output per il flusso corrente.
  def createText(textSetter, userPrompt)
    systemPrompt = textSetter.buildSystemPrompt
    generatedText = @textGenerator.generate_text(systemPrompt, userPrompt)
    return generatedText
  end

  # Costruisce i dati di output per il flusso corrente.
  def createImage(imageSetter, textResult)
    imagePrompt = imageSetter.buildImagePrompt(textResult)
    generatedImage = @imgGenerator.generate_image(imagePrompt)
    return generatedImage
  end
end
end
