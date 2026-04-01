class StylesController < ApplicationController

  # Recupera i dati necessari per l'operazione.
  def index
    company_id = params[:company_id]
    return render json: { error: "company_id mancante" }, status: :bad_request if company_id.blank?

    # find_by restituisce nil se non trova (vs find che lancia eccezione)
    company = Company.find_by(id: company_id)
    return render json: { error: "Azienda non trovata" }, status: :not_found unless company

    styles = company.styles
    active_only = params[:is_active] == "true"
    styles = styles.active if active_only
    
    render json: StyleSerializer.serialize_collection(styles), status: :ok
  end

  # Costruisce i dati di output per il flusso corrente.
  def create
    style = Style.new(style_params)
    if style.save
      render json: { id: style.id, name: style.name, description: style.description, is_active: style.is_active }, status: :ok
    else
      render json: { error: style.errors.full_messages.join(', ') }, status: :bad_request
    end
  end

  # Rimuove i dati previsti dal flusso corrente.
  def destroy
    style = Style.find_by(id: params[:id])

    if style && style.is_active
      style.update(is_active: false)
      render json: { message: "Stile eliminato con successo!" }, status: :ok
    else
      render json: { error: "Errore durante l'eliminazione dello stile." }, status: :bad_request
    end
  end

  private

  # Applica strong parameters per la creazione/aggiornamento degli style.
  def style_params
    params.require(:style).permit(:name, :description, :company_id, :is_active)
  end
end
