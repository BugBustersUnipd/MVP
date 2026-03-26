class CreateGeneratedData < ActiveRecord::Migration[8.1]
  def change
    create_table :generated_data do |t|
      t.string :title
      t.text :text_result
      t.string :img_path
      t.decimal :generation_time
      t.datetime :data_time
      t.decimal :rating
      t.text :prompt
      t.integer :height
      t.integer :width
      t.string :seed
      t.string :status
      t.references :tone, null: false, foreign_key: true
      t.references :style, null: false, foreign_key: true
      t.references :company, null: false, foreign_key: true
      t.bigint :version_id

      t.timestamps
    end
    add_index :generated_data, :version_id
  end
end
