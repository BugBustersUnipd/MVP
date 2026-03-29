require_relative "text_response_validator"

module AiGenerator
class AIGeneratorService
  BlockedResponseError = TextResponseValidator::BlockedResponseError

  def initialize(imgGenerator, textGenerator, aiGeneratorDataManager, setterFactory, textResponseValidator)
    @imgGenerator = imgGenerator
    @textGenerator = textGenerator
    @aiGeneratorDataManager = aiGeneratorDataManager
    @setterFactory = setterFactory
    @textResponseValidator = textResponseValidator
  end

  def create_content(generationID)
    generationData = @aiGeneratorDataManager.fetchGenerationData(generationID)
    toneDescription = @aiGeneratorDataManager.fetchToneDescription(generationData.tone_id)
    styleDescription = @aiGeneratorDataManager.fetchStyleDescription(generationData.style_id)
    companyDescription = @aiGeneratorDataManager.fetchCompanyDescription(generationData.company_id)
    companyName = Company.find(generationData.company_id).name

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

    textSetter.valid?
    imageSetter.valid?

    textResult = createText(textSetter, generationData.prompt)
    parsed_text = @textResponseValidator.parse!(textResult, generationID)

    imageResult = createImage(imageSetter, textResult)

    otherImageInfos = imageSetter.getData

    @aiGeneratorDataManager.saveContent(generationID, {image: imageResult, title: parsed_text[:title], text: parsed_text[:text], width: otherImageInfos[:width], height: otherImageInfos[:height], seed: otherImageInfos[:seed], responseTime: nil, dateTime: Time.now})
  end

  private

  def createText(textSetter, userPrompt)
    systemPrompt = textSetter.buildSystemPrompt
    generatedText = @textGenerator.generate_text(systemPrompt, userPrompt)
    return generatedText
  end

  def createImage(imageSetter, textResult)
    imagePrompt = imageSetter.buildImagePrompt(textResult)
    generatedImage = @imgGenerator.generate_image(imagePrompt)
    return generatedImage
  end
end
end
