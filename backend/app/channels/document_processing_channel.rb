class DocumentProcessingChannel < ApplicationCable::Channel
  # Esegue la logica applicativa del metodo.
  def subscribed
    stream_from "document_processing:#{params[:job_id]}"
  end
end
