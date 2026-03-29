class Style < ApplicationRecord
  belongs_to :company

  validates :company, presence: true
  validates :name, length: { maximum: 255 }, presence: true
  validates :description, length: { maximum: 1000 }, presence: true

  scope :active, -> { where(is_active: true) }
end
