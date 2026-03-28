class AddDescriptionToCompanies < ActiveRecord::Migration[8.1]
  def change
    add_column :companies, :description, :string, limit: 500
  end
end
