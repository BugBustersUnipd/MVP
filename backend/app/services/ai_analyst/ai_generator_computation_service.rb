module AiAnalyst
  class AiGeneratorComputationService < ComputationService
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

    def retrieve_prompt_amount
      manager.retrieve_prompt_amount_query
    end

    def retrieve_average_rate_prompt
      manager.retrieve_average_rate_prompt_query
    end

    def retrieve_average_regeneration_amount
      manager.retrieve_average_regeneration_amount_query
    end

    def retrieve_tone_usage
      manager.retrieve_tone_usage_query
    end

    def retrieve_style_usage
      manager.retrieve_style_usage_query
    end

    # Istanzia il manager specifico usando le date del service
    def manager
      @manager ||= Managers::AiGeneratorAnalysesDataManager.new(
        start_date: start_date,
        end_date: end_date
      )
    end
  end
end
