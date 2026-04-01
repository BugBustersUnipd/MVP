module AiGenerator
class AIGeneratorDataManager

  # Recupera i dati necessari per l'operazione.
  def fetchCompanyDescription(companyID)
    company = Company.find_by(id: companyID)
    raise ActiveRecord::RecordNotFound, "Company #{companyID} non trovata" unless company
    company.description
  end

  # Recupera i dati necessari per l'operazione.
  def fetchToneDescription(toneId)
    tone = Tone.find_by(id: toneId)
    tone ? tone.description : nil
  end

  # Recupera i dati necessari per l'operazione.
  def fetchStyleDescription(styleId)
    style = Style.find_by(id: styleId)
    style ? style.description : nil
  end

  # Recupera i dati necessari per l'operazione.
  def fetchGenerationData(generationID)
    generationData = GeneratedDatum.find_by(id: generationID)
    raise ActiveRecord::RecordNotFound, "GeneratedDatum #{generationID} non trovato" unless generationData
    generationData
  end

  # Salva testo e immagine generati aggiornando lo stato della generazione.
  def saveContent(generationID, aiResponseData)
    generationData = GeneratedDatum.find_by(id: generationID)
    return unless generationData

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
end
