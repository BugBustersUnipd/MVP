class GeneratedDatum < ApplicationRecord
  belongs_to :tone
  belongs_to :style
  belongs_to :company

  belongs_to :version, class_name: 'GeneratedDatum', foreign_key: 'version_id', optional: true
end
