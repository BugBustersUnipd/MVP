class RenameProcessingRunsOriginalFileName < ActiveRecord::Migration[8.1]
  def change
    rename_column :processing_runs, :original_file_name, :original_filename
  end
end
