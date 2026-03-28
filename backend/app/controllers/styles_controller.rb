class StylesController < ApplicationController

  def index
    company_id = params[:company_id]
    return render json: { error: "company_id mancante" }, status: :bad_request if company_id.blank?

    # find_by restituisce nil se non trova (vs find che lancia eccezione)
    company = Company.find_by(id: company_id)
    return render json: { error: "Azienda non trovata" }, status: :not_found unless company

    styles = company.styles
    
    render json: StyleSerializer.serialize_collection(styles), status: :ok
  end

  def create
    @style = Style.new(style_params)
    if @style.save
      render json: { id: @style.id, name: @style.name, description: @style.description }, status: :ok
    else
      render json: { error: @style.errors.full_messages.join(', ') }, status: :bad_request
    end
  end

  def destroy
    @style = Style.find_by(id: params[:id])

    if @style && @style.destroy
      render json: { message: "Stile eliminato con successo!" }, status: :ok
    else
      render json: { error: "Errore durante l'eliminazione dello stile." }, status: :bad_request
    end
  end

  private

  def style_params
    params.require(:style).permit(:name, :description, :company_id)
  end
end
