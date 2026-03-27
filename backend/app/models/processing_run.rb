class ProcessingRun < ApplicationRecord
  belongs_to :uploaded_document, optional: true
  has_many :processing_items, dependent: :destroy

  STATUSES = %w[queued splitting processing completed failed].freeze

  validates :job_id, presence: true, uniqueness: true
  validates :status, inclusion: { in: STATUSES }, allow_nil: true
end
