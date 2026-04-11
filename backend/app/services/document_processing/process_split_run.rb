module DocumentProcessing
  class ProcessSplitRun
    # Inizializza le dipendenze del componente.
    def initialize(
      split_run_repository:,
      file_storage:,
      pdf_splitter_factory:,
      data_extraction_job_class: DataExtractionJob
    )
      @split_run_repository = split_run_repository
      @file_storage = file_storage
      @pdf_splitter_factory = pdf_splitter_factory
      @data_extraction_job_class = data_extraction_job_class
    end

    # Esegue il flusso principale del servizio.
    def call(file_path:, job_id:)
      run = split_run_repository.find_run_by_job_id!(job_id)
      split_run_repository.mark_splitting!(run)

      pdf = CombinePDF.load(file_path)
      split_results = pdf_splitter_factory.call(pdf: pdf).split

      create_processing_items_and_enqueue(split_results, run)

      split_run_repository.mark_post_split_state!(run:, split_count: split_results.size)

      ActiveSupport::Notifications.instrument("document_processing.lifecycle",
        job_id: job_id,
        event: "split_completed",
        status: "success",
        original_pages: pdf.pages.size,
        mini_pdfs_count: split_results.size,
        mini_pdfs: split_results.map { |result| File.basename(result[:path]) }
      )

      return unless split_results.empty?

      ActiveSupport::Notifications.instrument("document_processing.lifecycle",
        job_id: job_id, event: "processing_completed", status: "success"
      )
    rescue StandardError => e
      split_run_repository.mark_failed(run:, error_message: e.message)
      ActiveSupport::Notifications.instrument("document_processing.lifecycle",
        job_id: job_id, event: "split_completed", status: "error", message: e.message
      )
    ensure
      cleanup_source_pdf(file_path, run)
    end

    private

    attr_reader :split_run_repository, :file_storage, :pdf_splitter_factory, :data_extraction_job_class

    # Costruisce i dati di output per il flusso corrente.
    def create_processing_items_and_enqueue(split_results, run)
      created_artifacts = split_run_repository.create_split_artifacts!(run:, split_results:)

      created_artifacts.each do |artifact|
        data_extraction_job_class.perform_later(
          artifact[:path],
          {
            job_id: run.job_id,
            processing_item_id: artifact[:processing_item_id],
            extracted_document_id: artifact[:extracted_document_id]
          }
        )
      end
    end

    # Normalizza il dato per mantenere il formato atteso.
    def cleanup_source_pdf(file_path, run)
      return unless file_path.present? && file_storage.exist?(file_path)

      source_path = split_run_repository.uploaded_source_path_for(run)
      return if source_path.present? && file_storage.expanded(source_path) == file_storage.expanded(file_path)

      file_storage.delete(file_path)
    end

  end
end