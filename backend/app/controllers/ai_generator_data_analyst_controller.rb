class AiGeneratorDataAnalystController < ApplicationController
  def index
    # recupera le date dai parametri della richiesta, o usa date di default
    start_date = params[:start_date] || 30.days.ago
    end_date = params[:end_date] || Time.current


    # istanzia il service specifico per il Copilot
    service = AiGeneratorComputationService.new(start_date: start_date, end_date: end_date)
    result = service.retrieve_all_information

    # da capire se fare un cambio da snake a camel case per il frontend, o se lasciare così

    # restituzione risultato
    render json: { 
      status: 'success', 
      data: result 
    }, status: :ok
  end
end