class TonesController < ApplicationController
  def index
    company_id = params[:company_id]
    return render json: { error: "company_id mancante" }, status: :bad_request if company_id.blank?

    # find_by restituisce nil se non trova (find lancia eccezione)
    company = Company.find_by(id: company_id)
    return render json: { error: "Azienda non trovata" }, status: :not_found unless company

    tones = company.tones
    active_only = params[:is_active] == "true"
    tones = tones.active if active_only
    
    render json: ToneSerializer.serialize_collection(tones), status: :ok
  end

  def create
    @tone = Tone.new(tone_params)
    if @tone.save

      render json: { id: @tone.id, name: @tone.name, description: @tone.description, is_active: @tone.is_active }, status: :ok
    else
      # Gestione errore semplice
      render json: { error: @tone.errors.full_messages.join(', ') }, status: :bad_request
    end
  end

  def destroy
    @tone = Tone.find_by(id: params[:id])

    if @tone && @tone.is_active
      @tone.update(is_active: false)
      render json: { message: "Tono eliminato con successo!" }, status: :ok
    else
      render json: { error: "Errore durante l'eliminazione del tono." }, status: :bad_request
    end
  end

  private

  def tone_params
    params.require(:tone).permit(:name, :description, :company_id, :is_active)
  end
end
