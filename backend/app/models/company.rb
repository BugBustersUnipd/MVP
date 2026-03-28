class Company < ApplicationRecord
  validates :description, length: { maximum: 500, message: "La descrizione è troppo lunga (max 500 caratteri)" }
end
