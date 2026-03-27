class AddProcessingAndExtractionIndexes < ActiveRecord::Migration[8.1]
  def change
    add_index :processing_runs, :job_id, unique: true unless index_exists?(:processing_runs, :job_id)

    add_index :processing_items, [:processing_run_id, :sequence], unique: true, name: 'index_processing_run_id_and_sequence' unless index_exists?(:processing_items, [:processing_run_id, :sequence])

    add_index :extracted_documents, [:uploaded_document_id, :sequence], unique: true, name: 'index_extracted_documents_on_uploaded_document_id_and_sequence' unless index_exists?(:extracted_documents, [:uploaded_document_id, :sequence])

    add_index :extracted_documents, :status unless index_exists?(:extracted_documents, :status)
    add_index :processing_items, :status unless index_exists?(:processing_items, :status)
    add_index :processing_runs, :status unless index_exists?(:processing_runs, :status)
  end
end
