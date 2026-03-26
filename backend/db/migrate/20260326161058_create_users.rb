class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :cf
      t.string :username
      t.string :password
      t.string :email
      t.string :name
      t.string :surname

      t.timestamps
    end
  end
end
