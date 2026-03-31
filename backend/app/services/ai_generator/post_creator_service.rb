module AiGenerator
class PostCreatorService
  def self.create_post(safe_params)
    return invalid_post("ID mancante") if safe_params[:generated_datum_id].blank?

    generation = GeneratedDatum.find_by(id: safe_params[:generated_datum_id])
    return invalid_post("Generazione non trovata") if generation.nil?

    if Post.exists?(generated_datum_id: generation.id)
      return invalid_post("Post gia esistente per questa generazione")
    end

    title = safe_params[:title].presence || generation.title
    text = safe_params[:body_text].presence || generation.text_result
    date_time = safe_params[:date_time].presence || generation.data_time

    post = Post.new(
      title: title,
      body_text: text,
      date_time: date_time,
      generated_datum_id: generation.id
    )

    post.post_image.attach(generation.generated_image.blob) if generation.generated_image.attached?
    post.save
    post
  end

  def self.invalid_post(message)
    Post.new.tap { |post| post.errors.add(:base, message) }
  end

  private_class_method :invalid_post
end
end
