class CreateExtractedDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :extracted_documents do |t|
      t.string :confidence
      t.integer :page_start
      t.integer :page_end
      t.text :error_message
      t.integer :sequence
      t.jsonb :metadata
      t.string :status
      t.decimal :process_time_seconds
      t.datetime :processed_at
      t.references :uploaded_document, null: false, foreign_key: true
      t.references :matched_employee, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
