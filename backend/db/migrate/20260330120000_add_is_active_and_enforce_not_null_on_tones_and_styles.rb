class AddIsActiveAndEnforceNotNullOnTonesAndStyles < ActiveRecord::Migration[8.1]
  def change
    # Add is_active column with default true
    add_column :tones, :is_active, :boolean, default: true, null: false
    add_column :styles, :is_active, :boolean, default: true, null: false

    # Enforce NOT NULL on name and description
    change_column_null :tones, :name, false
    change_column_null :tones, :description, false
    change_column_null :styles, :name, false
    change_column_null :styles, :description, false

    # Add unique index on (company_id, name) for tones and styles
    add_index :tones, [:company_id, :name], unique: true
    add_index :styles, [:company_id, :name], unique: true
  end
end
