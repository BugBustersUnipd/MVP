class CreateTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :templates do |t|
      t.text :subject
      t.text :body_text

      t.timestamps
    end
  end
end
