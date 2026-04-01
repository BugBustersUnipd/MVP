class GeneratedDatumSerializer
  def self.serialize(generation)
    {
      id: generation.id,
      title: generation.title,
      text_result: generation.text_result,
      imgPath: image_path(generation),
      dateTime: generation.data_time&.iso8601,
      toneId: generation&.tone_id,
      toneName: generation&.tone&.name,
      is_tone_active: generation&.tone&.is_active,
      styleId: generation&.style_id,
      styleName: generation&.style&.name,
      is_style_active: generation&.style&.is_active,
      prompt: generation&.prompt,
      companyId: generation&.company_id,
      companyName: generation&.company&.name,
      rating: generation&.rating
    }
  end

  def self.serialize_collection(generated_data)
    {
      generated_datum: generated_data.map do |generation|
        serialize(generation)
      end
    }
  end

  def self.image_path(generation)
    return nil unless generation.generated_image.attached?

    Rails.application.routes.url_helpers.rails_blob_path(generation.generated_image, only_path: true)
  end
end