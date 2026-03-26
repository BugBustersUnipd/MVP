class CreateProcessingItems < ActiveRecord::Migration[8.1]
  def change
    create_table :processing_items do |t|
      t.text :error_message
      t.string :status
      t.integer :sequence
      t.string :filename
      t.references :extracted_document, null: false, foreign_key: true
      t.references :processing_run, null: false, foreign_key: true

      t.timestamps
    end
  end
end
