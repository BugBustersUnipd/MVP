class AiJobOrchestrator
  
  # 1. Metodo d'ingresso: crea il record e mette il Job in coda
  def self.orchestrate(params)
    # Creiamo il record con stato iniziale
    generation = GeneratedDatum.create(params.merge(status: 'pending'))
    
    if generation.persisted?
      # Lanciamo il Job passandogli l'ID
      AiGeneratorJob.perform_later(generation.id)
    end
    
    generation # Restituiamo l'oggetto al controller
  end

  # 2. Metodo di aggiornamento: chiamato dal Job quando inizia il lavoro vero
  def self.signal_process_start(generationId)
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    generation.update(status: 'processing', date_time: Time.current)
    
    # Opzionale: Notifica via ActionCable che l'elaborazione è iniziata
    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'processing' 
    })
  end

  # 3. Metodo di chiusura: chiamato dal Job (o dal Service) alla fine
  def self.complete(generationId)
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    image_url = if generation.generated_image.attached?
                  Rails.application.routes.url_helpers.rails_blob_path(generation.generated_image, only_path: true)
                end
                
    # Notifica finale via ActionCable
    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'completed', # forse
      title: generation.title,
      text: generation.text_result,
      image_url: image_url,
      created_at: generation.created_at.strftime("%Y-%m-%d %H:%M:%S")
    })
  end

  #4. Metodo di gestione errori: chiamato dal Job (o dal Service) in caso di problemi
  def self.signal_failure(generationId, error_message = "Errore generico durante la generazione")
    generation = GeneratedDatum.find_by(id: generationId)
    return unless generation

    # Segnamo il fallimento nel DB per debug
    generation.update(
      status: 'failed',
      updated_at: Time.current,
      #error_log: error_message # Assicurati di avere questa colonna o usa 'result'
    )

    # Notifichiamo il frontend che c'è stato un problema
    ActionCable.server.broadcast("generation_channel", { 
      id: generationId, 
      status: 'failed',
      error: error_message 
    })
  end
end