class ExtractedDocument < ApplicationRecord
  belongs_to :uploaded_document

  belongs_to :matched_employee, class_name: 'User', optional: true

  STATUSES = %w[queued in_progress done failed sent validated].freeze

  validates :sequence, presence: true
  validates :page_start, :page_end, presence: true, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: STATUSES }, allow_nil: true
  validate :end_page_must_be_after_start

  def done?     = status == "done"
  def failed?   = status == "failed"
  def validated? = status == "validated"

  private

  def end_page_must_be_after_start
    return if page_start.blank? || page_end.blank?
    return if page_end >= page_start

    errors.add(:page_end, 'deve essere maggiore o uguale a page_start')
  end
end
