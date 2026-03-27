class ProcessingItem < ApplicationRecord
  belongs_to :processing_run
  belongs_to :extracted_document, optional: true

  STATUSES = %w[queued in_progress done failed].freeze

  validates :sequence, presence: true
  validates :status, inclusion: { in: STATUSES }, allow_nil: true
end
