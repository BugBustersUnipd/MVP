class RenameTemplateDocumentToTemplateInSendings < ActiveRecord::Migration[8.1]
  def change
    if column_exists?(:sendings, :template_document_id)
      remove_foreign_key :sendings, column: :template_document_id rescue nil
      rename_column :sendings, :template_document_id, :template_id
      add_foreign_key :sendings, :templates, column: :template_id unless foreign_key_exists?(:sendings, :templates, column: :template_id)
      change_column_null :sendings, :template_id, true
      add_index :sendings, :template_id unless index_exists?(:sendings, :template_id)
    end
  end
end
