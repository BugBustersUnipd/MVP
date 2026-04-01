module AiAnalyst
  class AiCopilotComputationService < ComputationService
    # Restituisce il riepilogo KPI del modulo AI Copilot nel periodo richiesto.
    def retrieve_all_information
      {
        average_confidence: retrieve_average_confidence_value,
        average_human_intervention: retrieve_human_intervention_value,
        mapping_accuracy: retrieve_mapping_accuracy,
        average_time_analyses: retrieve_average_time_analyses
      }
    end

    private

    # Recupera la confidenza media delle estrazioni.
    def retrieve_average_confidence_value
      manager.retrieve_average_confidence_value_query
    end

    # Recupera il numero medio di interventi manuali.
    def retrieve_human_intervention_value
      manager.retrieve_human_intervention_value_query
    end

    # Recupera la percentuale di mapping corretto verso i dipendenti.
    def retrieve_mapping_accuracy
      manager.retrieve_mapping_accuracy_query
    end

    # Recupera il tempo medio di analisi dei documenti.
    def retrieve_average_time_analyses
      manager.retrieve_average_time_analyses_query
    end

    # Istanzia il manager specifico usando le date del servizio
    def manager
      @manager ||= Managers::AiCopilotAnalysesDataManager.new(
        start_date: start_date,
        end_date: end_date
      )
    end
  end
end
