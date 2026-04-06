class AiGeneratorJob < ApplicationJob
  queue_as :default

  # Esegue la logica applicativa del metodo.
  def perform(generation_id)
    generation = GeneratedDatum.find_by(id: generation_id)
    return unless generation

    generation.update(status: 'processing', data_time: Time.current)
    ActiveSupport::Notifications.instrument("generation.lifecycle",
      id: generation_id, status: 'processing'
    )

    begin
      service = AiGenerator::AiGeneratorContainer.new.aiGeneratorService
      service.create_content(generation_id)

      generation.reload
      image_url = if generation.generated_image.attached?
                    Rails.application.routes.url_helpers.rails_blob_path(generation.generated_image, only_path: true)
                  end

      ActiveSupport::Notifications.instrument("generation.lifecycle",
        id: generation_id,
        status: 'completed',
        title: generation.title,
        text: generation.text_result,
        image_url: image_url,
        created_at: generation.created_at.strftime("%Y-%m-%d %H:%M:%S")
      )

    rescue => e
      Rails.logger.error "ERRORE JOB AI: #{e.message}"

      generation.update(status: 'failed')
      ActiveSupport::Notifications.instrument("generation.lifecycle",
        id: generation_id, status: 'failed', error: e.message
      )

      generation.destroy if e.is_a?(AiGenerator::AIGeneratorService::BlockedResponseError)
    end
  end
end
