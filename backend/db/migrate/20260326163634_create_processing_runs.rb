class CreateProcessingRuns < ActiveRecord::Migration[8.1]
  def change
    create_table :processing_runs do |t|
      t.string :status
      t.datetime :completed_at
      t.text :error_message
      t.string :job_id
      t.string :original_file_name
      t.integer :processed_documents
      t.integer :total_documents
      t.references :uploaded_document, null: false, foreign_key: true

      t.timestamps
    end
  end
end
