class UploadedDocument < ApplicationRecord
  has_many :extracted_documents, dependent: :destroy
  belongs_to :employee, optional: true

  validates :original_filename, presence: true
  validates :storage_path, presence: true
  validates :page_count, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :checksum, presence: true, uniqueness: true
  validates :file_kind, inclusion: { in: %w[pdf csv image] }, allow_nil: true
end
