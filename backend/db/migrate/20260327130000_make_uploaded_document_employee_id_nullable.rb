class MakeUploadedDocumentEmployeeIdNullable < ActiveRecord::Migration[8.1]
  def change
    change_column_null :uploaded_documents, :employee_id, true
  end
end
