class Company < ApplicationRecord
  has_many :tones, dependent: :destroy
  has_many :styles, dependent: :destroy
  has_many :generated_data, dependent: :destroy
  validates :description, length: { maximum: 500, message: "La descrizione è troppo lunga (max 500 caratteri)" }
end
