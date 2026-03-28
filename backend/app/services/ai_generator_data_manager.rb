class AIGeneratorDataManager

  def fetchCompanyDescription(companyID)
    companyDescription = Company.find(companyID).description
    return companyDescription
  end

  def fetchToneDescription(toneId)
    tone = Tone.find(toneId)
    tone ? tone.instructions : nil
  end

  def fetchStyleDescription(styleId)
    style = Style.find(styleId)
    style ? style.description : nil
  end

  def fetchGenerationData(generationID)
    generationData = GenerationDatum.find(generationID)
    return generationData
  end

  def saveContent(generationID, aiResponseData)
    generationData = GenerationDatum.find(generationID)

    if aiResponseData[:image].present?
      base64_string = aiResponseData[:image]
      clean_base64 = base64_string.gsub(%r{\Adata:image/.+;base64,}, '')
      image_data = Base64.decode64(clean_base64)

      generationData.generated_image.attach(
        io: StringIO.new(image_data),
        filename: "ai_result_#{generationData.id}.png",
        content_type: "image/png"
      )
    end

    generationData.update(
      title: aiResponseData[:title],
      text_result: aiResponseData[:text],
      width: aiResponseData[:width],
      height: aiResponseData[:height],
      seed: aiResponseData[:seed],
      generation_time: aiResponseData[:responseTime],
      data_time: aiResponseData[:dateTime],
      status: 'completed'
    )

    return generationData
  end
end