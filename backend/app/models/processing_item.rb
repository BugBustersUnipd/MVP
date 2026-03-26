class ProcessingItem < ApplicationRecord
  belongs_to :extracted_document
  belongs_to :processing_run
end
