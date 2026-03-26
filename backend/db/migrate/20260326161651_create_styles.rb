class CreateStyles < ActiveRecord::Migration[8.1]
  def change
    create_table :styles do |t|
      t.string :name
      t.text :description
      t.references :company, null: false, foreign_key: true

      t.timestamps
    end
  end
end
