class AddStartedAtAndRecipientAndNulls < ActiveRecord::Migration[8.1]
  def change
    unless column_exists?(:processing_runs, :started_at)
      add_column :processing_runs, :started_at, :datetime
    end

    if column_exists?(:extracted_documents, :matched_employee_id)
      change_column_null :extracted_documents, :matched_employee_id, true
    end

    unless column_exists?(:extracted_documents, :recipient_id)
      add_reference :extracted_documents, :recipient, foreign_key: { to_table: :users }, type: :bigint, null: true
    end

    if column_exists?(:processing_items, :extracted_document_id)
      change_column_null :processing_items, :extracted_document_id, true
    end

    if column_exists?(:processing_runs, :uploaded_document_id)
      change_column_null :processing_runs, :uploaded_document_id, true
    end
  end
end
