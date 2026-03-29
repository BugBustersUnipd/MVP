module AiGenerator
class PostCreatorService
    def create_post(safe_params)
      if safe_params[:generated_datum_id].blank?
        render json: { error: "ID mancante" }, status: :unprocessable_entity
        return
      end

      generation = GeneratedDatum.find_by(id: safe_params[:generated_datum_id])
      if generation.nil?
        render json: { error: "Generazione non trovata" }, status: :not_found
        return
      end

      title = safe_params[:title].presence || generation.title
      text = safe_params[:body_text].presence || generation.text_result
      image_url = safe_params[:img_path].presence || (generation.generated_image.attached? ? url_for(generation.generated_image) : nil)
      dateTime = safe_params[:date_time].presence || generation.date_time
      return Post.create(title: title, body_text: text, img_path: image_url, date_time: dateTime, generated_datum_id: generation.id)
    end
end
end
