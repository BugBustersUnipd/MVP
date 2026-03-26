class Sending < ApplicationRecord
  belongs_to :recipient, class_name: 'User'
  belongs_to :template_document, class_name: 'Template'

  belongs_to :extracted_document
end
