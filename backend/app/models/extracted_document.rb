class ExtractedDocument < ApplicationRecord
  belongs_to :uploaded_document

  belongs_to :matched_employee, class_name: 'User', optional: true
end
