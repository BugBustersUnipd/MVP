class FixExtractedDocumentsSchema < ActiveRecord::Migration[8.1]
  def up
    # confidence was wrongly created as string; the code uses it as a JSON hash
    change_column :extracted_documents, :confidence, :jsonb, using: "NULL::jsonb"

    # recipient_id was a FK to users, but the code stores it as a plain text string.
    # matched_employee_id already holds the resolved User FK.
    remove_foreign_key :extracted_documents, column: :recipient_id
    remove_column :extracted_documents, :recipient_id
    add_column :extracted_documents, :recipient, :text
  end

  def down
    remove_column :extracted_documents, :recipient
    add_column :extracted_documents, :recipient_id, :bigint
    add_foreign_key :extracted_documents, :users, column: :recipient_id
    change_column :extracted_documents, :confidence, :string
  end
end
