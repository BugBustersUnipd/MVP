module DocumentProcessing
  module Lookups
    class UsersFetcher
      # Restituisce uno scope di Employee.
      # Se viene passato `company`, filtra gli employee che appartengono a quella Company in DB.
      def call(company: nil)
        return Employee.all if company.nil? || company.to_s.strip.empty?

        company = company.to_s.strip
        Employee.joins(:company).where(companies: { name: company })
      end
    end
  end
end
