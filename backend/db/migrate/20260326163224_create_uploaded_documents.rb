class CreateUploadedDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :uploaded_documents do |t|
      t.string :checksum
      t.string :file_kind
      t.string :storage_path
      t.string :original_filename
      t.string :override_company
      t.string :override_department
      t.integer :page_count
      t.string :category
      t.string :competence_period
      t.references :employee, null: false, foreign_key: true

      t.timestamps
    end
  end
end
