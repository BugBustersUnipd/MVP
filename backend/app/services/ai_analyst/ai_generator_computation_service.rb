module AiAnalyst
  class AiGeneratorComputationService < ComputationService
    # Restituisce il riepilogo KPI del modulo AI Generator nel periodo richiesto.
    def retrieve_all_information
      {
        prompt_amount: retrieve_prompt_amount,
        average_rate_prompt: retrieve_average_rate_prompt,
        average_regeneration_amount: retrieve_average_regeneration_amount,
        tone_usage: retrieve_tone_usage,
        style_usage: retrieve_style_usage
      }
    end

    private

    # Recupera il numero di prompt inviati.
    def retrieve_prompt_amount
      manager.retrieve_prompt_amount_query
    end

    # Recupera il rating medio assegnato ai contenuti generati.
    def retrieve_average_rate_prompt
      manager.retrieve_average_rate_prompt_query
    end

    # Recupera il numero medio di rigenerazioni per contenuto.
    def retrieve_average_regeneration_amount
      manager.retrieve_average_regeneration_amount_query
    end

    # Recupera la distribuzione di utilizzo dei tone.
    def retrieve_tone_usage
      manager.retrieve_tone_usage_query
    end

    # Recupera la distribuzione di utilizzo degli style.
    def retrieve_style_usage
      manager.retrieve_style_usage_query
    end

    # Istanzia il manager specifico usando le date del servizio
    def manager
      @manager ||= Managers::AiGeneratorAnalysesDataManager.new(
        start_date: start_date,
        end_date: end_date
      )
    end
  end
end
