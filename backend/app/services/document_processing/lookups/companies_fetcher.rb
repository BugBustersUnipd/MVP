module DocumentProcessing
  module Lookups
    class CompaniesFetcher
      # Restituisce un array di hash { id:, name: } dalla tabella companies, ordinati per nome.
      def call
        Company.where.not(name: [nil, ""]).order(:name).pluck(:id, :name).map { |id, name| { id: id, name: name } }
      end
    end
  end
end