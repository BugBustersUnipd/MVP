class ChangeProcessingItemsSequenceToInteger < ActiveRecord::Migration[8.1]
  def up
    return unless column_exists?(:processing_items, :sequence)

    # try to cast existing values to integer; if any non-numeric values exist this will fail at runtime
    change_column :processing_items, :sequence, :integer, using: 'sequence::integer'
    change_column_null :processing_items, :sequence, false
  end

  def down
    return unless column_exists?(:processing_items, :sequence)

    change_column :processing_items, :sequence, :string, using: 'sequence::text'
    change_column_null :processing_items, :sequence, true
  end
end
