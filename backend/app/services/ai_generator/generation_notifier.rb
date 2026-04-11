module AiGenerator
  class GenerationNotifier
    CHANNEL = "generation_channel"

    # Inizializza le dipendenze del componente.
    def initialize(broadcaster: ActionCable.server)
      @broadcaster = broadcaster
    end

    # Invia l'output verso il canale di generazione.
    def broadcast(data)
      @broadcaster.broadcast(CHANNEL, data)
    end
  end
end
