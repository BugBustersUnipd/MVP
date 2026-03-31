class GeneratedDataController < ApplicationController
  def create
    # L'Orchestrator si occupa di tutto: salvataggio record e lancio Job
    generation = AiGenerator::AiJobOrchestrator.orchestrate(generation_params)

    if generation.persisted? # Verifichiamo se l'Orchestrator è riuscito a salvare
      render json: { 
        status: "started", 
        id: generation.id, 
        message: "Richiesta presa in carico dall'Orchestrator." 
      }, status: :ok
    else
      render json: { errors: generation.errors.full_messages }, status: :unprocessable_entity
    end
  rescue AiGenerator::AiJobOrchestrator::InactiveConfigurationError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def show
    generation = GeneratedDatum.find_by(id: params[:id])
    if generation && generation.status == 'completed'
      render json: GeneratedDatumSerializer.serialize(generation), status: :ok
    else
      render json: { error: "Generazione non trovata o non completata." }, status: :not_found
    end
  end

  def rating
    generation = GeneratedDatum.find_by(id: params[:id])
    rating_value = params[:rating].to_i

    if generation && rating_value.between?(1, 5)
      generation.update(rating: rating_value)
      render json: { message: "Rating salvato con successo!" }, status: :ok
    else
      render json: { error: "Rating deve essere tra 1 e 5." }, status: :bad_request
    end
  end

  def regenerate
    parent = GeneratedDatum.find_by(id: params[:id])
    
    return render json: { error: "Generazione non trovata." }, status: :not_found if parent.blank?

    new_params = {
      prompt:     parent.prompt,
      company_id: parent.company_id,
      style_id:   parent.style_id,
      tone_id:    parent.tone_id,
      version_id: parent.id
    }

    generation = AiGenerator::AiJobOrchestrator.orchestrate(new_params)

    if generation.persisted?
      render json: { status: "started", id: generation.id }, status: :ok
    else
      render json: { errors: generation.errors.full_messages }, status: :unprocessable_entity
    end
  rescue AiGenerator::AiJobOrchestrator::InactiveConfigurationError => e
    render json: { error: e.message }, status: :unprocessable_entity
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Generazione non trovata." }, status: :not_found
  end

  def destroy
    generation = GeneratedDatum.find_by(id: params[:id])
    if generation && generation.destroy
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
