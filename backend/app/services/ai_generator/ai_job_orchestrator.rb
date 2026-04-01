module AiGenerator
class AiJobOrchestrator
  InactiveConfigurationError = Class.new(StandardError)
  
  # Valida la configurazione, crea la generazione e avvia il job asincrono.
  def self.orchestrate(params)
    ensure_active_configuration!(params)

    generation = GeneratedDatum.create(params.merge(status: 'pending'))
    if generation.persisted?
      AiGeneratorJob.perform_later(generation.id)
    end
    generation
  end

  
  def self.signal_process_start(generationId)
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    generation.update(status: 'processing', data_time: Time.current)
    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'processing' 
    })
  end

  # Notifica il completamento della generazione inviando i dati al canale realtime.
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

  # Gestione errore del flusso.
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

  # Verifica che tone e style selezionati siano attivi.
  def self.ensure_active_configuration!(params)
    errors = []

    tone = Tone.find_by(id: params[:tone_id])
    style = Style.find_by(id: params[:style_id])

    errors << "Il tone selezionato non e attivo." if tone&.is_active == false
    errors << "Lo style selezionato non e attivo." if style&.is_active == false

    return if errors.empty?

    raise InactiveConfigurationError, errors.join(" ")
  end
end
end
