class AiGeneratorDataAnalystController < ApplicationController
  # Recupera i dati necessari per l'operazione.
  def index
    # Recupera le date dai parametri, con fallback predefinito.
    start_date = params[:start_date] || 30.days.ago
    end_date = params[:end_date] || Time.current


    # Istanzia il servizio specifico per il Copilot.
    service = AiAnalyst::AiGeneratorComputationService.new(start_date: start_date, end_date: end_date)
    result = service.retrieve_all_information

    # restituzione risultato
    render json: { 
      status: 'success', 
      data: result 
    }, status: :ok
  end
end