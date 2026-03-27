class ComputationService
  attr_reader :start_date, :end_date

  # Il diagramma dice initialize(data: hash), quindi:
  def initialize(data = {})
    @start_date = data[:start_date]
    @end_date = data[:end_date]
  end

  def retrieve_all_information
    raise NotImplementedError, "Le classi figlie devono implementare questo metodo"
  end
end