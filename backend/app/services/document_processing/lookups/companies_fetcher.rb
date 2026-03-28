module DocumentProcessing
  module Lookups
    class CompaniesFetcher
      # Restituisce un array di nomi azienda dalla tabella companies, ordinati.
      def call
        Company.where.not(name: [nil, ""]).order(:name).pluck(:name)
      end
    end
  end
end