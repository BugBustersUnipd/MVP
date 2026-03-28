module AiAnalyst
  class AiCopilotComputationService < ComputationService
    def retrieve_all_information
      {
        average_confidence: retrieve_average_confidence_value,
        average_human_intervention: retrieve_human_intervention_value,
        mapping_accuracy: retrieve_mapping_accuracy,
        average_time_analyses: retrieve_average_time_analyses
      }
    end

    private

    def retrieve_average_confidence_value
      manager.retrieve_average_confidence_value_query
    end

    def retrieve_human_intervention_value
      manager.retrieve_human_intervention_value_query
    end

    def retrieve_mapping_accuracy
      manager.retrieve_mapping_accuracy_query
    end

    def retrieve_average_time_analyses
      manager.retrieve_average_time_analyses_query
    end

    # Istanzia il manager specifico usando le date del service
    def manager
      @manager ||= Managers::AiCopilotAnalysesDataManager.new(
        start_date: start_date,
        end_date: end_date
      )
    end
  end
end
