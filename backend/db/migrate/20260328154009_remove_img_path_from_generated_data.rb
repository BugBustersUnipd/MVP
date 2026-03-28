class RemoveImgPathFromGeneratedData < ActiveRecord::Migration[8.1]
  def change
    remove_column :generated_data, :img_path, :string
  end
end
