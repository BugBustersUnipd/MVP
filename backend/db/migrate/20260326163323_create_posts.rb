class CreatePosts < ActiveRecord::Migration[8.1]
  def change
    create_table :posts do |t|
      t.string :title
      t.text :body_text
      t.datetime :date_time
      t.string :img_path
      t.references :generated_datum, null: false, foreign_key: true

      t.timestamps
    end
  end
end
