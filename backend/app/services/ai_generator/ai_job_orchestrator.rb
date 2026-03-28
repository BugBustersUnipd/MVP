module AiGenerator
class AiJobOrchestrator
  
  def self.orchestrate(params)
    generation = GeneratedDatum.create(params.merge(status: 'pending'))
    if generation.persisted?
      AiGeneratorJob.perform_later(generation.id)
    end
    generation
  end

  def self.signal_process_start(generationId)
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    generation.update(status: 'processing', date_time: Time.current)
    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'processing' 
    })
  end

  def self.complete(generationId)
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    image_url = if generation.generated_image.attached?
                  Rails.application.routes.url_helpers.rails_blob_path(generation.generated_image, only_path: true)
                end
    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'completed', 
      title: generation.title,
      text: generation.text_result,
      image_url: image_url,
      created_at: generation.created_at.strftime("%Y-%m-%d %H:%M:%S")
    })
  end

  def self.signal_failure(generationId, error_message = "Errore generico durante la generazione")
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    generation.update(
      status: 'failed',
      updated_at: Time.current,
    )

    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'failed',
      error: error_message 
    })
  end
end
end
