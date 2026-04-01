class PdfSplitJob < ApplicationJob
  queue_as :split

  # Esegue la logica applicativa del metodo.
  def perform(file_path, job_id)
    container = build_container
    container.process_split_run_service.call(
      file_path:,
      job_id: extract_job_id(job_id)
    )
  end

  private

  # Costruisce i dati di output per il flusso corrente.
  def build_container
    DocumentProcessing::Container.new
  end

  # Estrae e prepara i dati utili al processamento.
  def extract_job_id(job_id_or_context)
    return job_id_or_context unless job_id_or_context.is_a?(Hash)

    job_id_or_context[:job_id] || job_id_or_context["job_id"]
  end
end
