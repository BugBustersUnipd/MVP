module AiAnalyst
  module Managers
    class AnalysesDataManager
      attr_reader :start_date, :end_date

      # Inizializza le dipendenze del componente.
      def initialize(start_date:, end_date:)
        @start_date = start_date
        @end_date = end_date
      end
    end
  end
end
