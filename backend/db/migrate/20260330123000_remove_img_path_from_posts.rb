class RemoveImgPathFromPosts < ActiveRecord::Migration[8.1]
  def change
    remove_column :posts, :img_path, :string
  end
end
