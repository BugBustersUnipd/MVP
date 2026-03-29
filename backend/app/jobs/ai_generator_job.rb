class AiGeneratorJob < ApplicationJob
  queue_as :default

  def perform(generation_id)
    AiGenerator::AiJobOrchestrator.signal_process_start(generation_id)
    
    begin
      service = AiGenerator::AiGeneratorContainer.new.aiGeneratorService
      service.create_content(generation_id)

      AiGenerator::AiJobOrchestrator.complete(generation_id)

    rescue => e
      # Logghiamo l'errore sulla console del server per noi sviluppatori
      Rails.logger.error "ERRORE JOB AI: #{e.message}"
      
      # Avvisiamo l'Orchestrator per sbloccare il frontend
      AiGenerator::AiJobOrchestrator.signal_failure(generation_id, e.message)

      # Se il modello restituisce un messaggio bloccante, eliminiamo il record.
      if e.is_a?(AiGenerator::AIGeneratorService::BlockedResponseError)
        GeneratedDatum.find_by(id: generation_id)&.destroy
      end
    end
  end
end