module AiGenerator
  class AiJobOrchestrator
    InactiveConfigurationError = Class.new(StandardError)

    # Valida la configurazione, crea la generazione e avvia il job asincrono.
    def self.orchestrate(params)
      ensure_active_configuration!(params)

      generation = GeneratedDatum.create(params.merge(status: 'pending'))
      AiGeneratorJob.perform_later(generation.id) if generation.persisted?
      generation
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
