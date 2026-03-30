class Post < ApplicationRecord
  belongs_to :generated_datum

  has_one_attached :post_image
end
