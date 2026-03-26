class CreateSendings < ActiveRecord::Migration[8.1]
  def change
    create_table :sendings do |t|
      t.text :body
      t.datetime :sent_at
      t.string :subject
      t.references :recipient, null: false, foreign_key: { to_table: :users }
      t.references :extracted_document, null: false, foreign_key: true
      t.references :template_document, null: false, foreign_key: { to_table: :templates }

      t.timestamps
    end
  end
end
