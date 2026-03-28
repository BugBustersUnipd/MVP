class GeneratedDatum < ApplicationRecord
  has_one_attached :generated_image

  belongs_to :tone
  belongs_to :style
  belongs_to :company

  belongs_to :version, class_name: 'GeneratedDatum', foreign_key: 'version_id', optional: true
end
