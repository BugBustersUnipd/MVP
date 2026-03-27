class AddIndexesAndDefaultsToUploadedDocuments < ActiveRecord::Migration[8.1]
  def change
    add_index :uploaded_documents, :checksum, unique: true unless index_exists?(:uploaded_documents, :checksum)
    add_index :uploaded_documents, :file_kind unless index_exists?(:uploaded_documents, :file_kind)

    # Set sensible default for page_count if the column exists
    if column_exists?(:uploaded_documents, :page_count)
      change_column_default :uploaded_documents, :page_count, from: nil, to: 0
    end
  end
end
