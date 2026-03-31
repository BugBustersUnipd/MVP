class RemoveUniqueNameIndexesFromTonesAndStyles < ActiveRecord::Migration[8.1]
  def change
    remove_index :tones, name: "index_tones_on_company_id_and_name"
    remove_index :styles, name: "index_styles_on_company_id_and_name"
  end
end
