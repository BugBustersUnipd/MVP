class GeneratedDataController < ApplicationController
  def create
    # L'Orchestrator si occupa di tutto: salvataggio record e lancio Job
    @generation = AiJobOrchestrator.orchestrate(generation_params)

    if @generation.persisted? # Verifichiamo se l'Orchestrator è riuscito a salvare
      render json: { 
        status: "started", 
        id: @generation.id, 
        message: "Richiesta presa in carico dall'Orchestrator." 
      }, status: :ok
    else
      render json: { errors: @generation.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def show
    @generation = GeneratedDatum.find(params[:id])
  end

  def rating
    @generation = GeneratedDatum.find(params[:id])
    rating_value = params[:rating].to_i

    if @generation && rating_value.between?(1, 5)
      @generation.update(rating: rating_value)
      render json: { message: "Rating salvato con successo!" }, status: :ok
    else
      render json: { error: "Rating deve essere tra 1 e 5." }, status: :bad_request
    end
  end

  def destroy
    @generation = GeneratedDatum.find(params[:id])
    if @generation.destroy
      render json: { message: "Generazione eliminata con successo." }, status: :ok
    else
      render json: { error: "Impossibile eliminare la generazione." }, status: :unprocessable_entity
    end
  end

  private

  # Definiamo quali dati accettiamo dal form
  def generation_params
    params.require(:generation_datum).permit(:prompt, :company_id, :style_id, :tone_id, :version)
  end
end
