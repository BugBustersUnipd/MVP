module DocumentProcessing
  class ActionCableNotifier
    # Inizializza le dipendenze del componente.
    def initialize(broadcaster: ActionCable.server)
      @broadcaster = broadcaster
    end

    # Invia l'output verso il canale previsto.
    def broadcast(job_id, data)
      @broadcaster.broadcast("document_processing:#{job_id}", data)
    end
  end
end