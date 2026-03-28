module AiGenerator
class AIGeneratorService
  def initialize(imgGenerator, textGenerator, aiGeneratorDataManager, setterFactory)
    @imgGenerator = imgGenerator
    @textGenerator = textGenerator
    @aiGeneratorDataManager = aiGeneratorDataManager
    @setterFactory = setterFactory
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
    imageResult = createImage(imageSetter, textResult)

    otherImageInfos = imageSetter.getData

    match_data = textResult.match(/^\|\s*(.*?)\s*\|\s*(.*)/m)

    if match_data
      title = match_data[1].strip
      content = match_data[2].strip
    else
      if textResult.include?('|')
        parts = textResult.split('|').reject(&:blank?)
        title = parts[0].strip
        content = parts[1..-1].join('|').strip
      else
        title = "Generazione ##{generationID}"
        content = textResult
      end
    end

    @aiGenerationDataManager.saveContent(generationID, {image: imageResult, title: title, text: content, width: otherImageInfos[:width], height: otherImageInfos[:height], seed: otherImageInfos[:seed], responseTime: nil, dateTime: Time.now})
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
