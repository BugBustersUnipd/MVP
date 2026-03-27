require "test_helper"

class ExtractedDocumentPresenterTest < ActiveSupport::TestCase
  class FakeUrlHelpers
    def extracted_pdf_document_path(id:)
      "/documents/extracted/#{id}/pdf"
    end
  end

  test "as_json includes expected fields and formatted employee" do
    company = Company.first || Company.create!(name: "TestCo")
    user = User.create!(email: "mario@test.it", name: "Mario", username: "mario_pres")
    employee = Employee.create!(user: user, company: company)
    uploaded = UploadedDocument.create!(original_filename: "x.pdf", storage_path: "/tmp/x", page_count: 1, checksum: "pres-1", file_kind: "pdf", employee: employee)
    doc = ExtractedDocument.create!(
      uploaded_document: uploaded,
      matched_employee: user,
      sequence: 1,
      page_start: 1,
      page_end: 1,
      status: "done",
      metadata: { "type" => "cedolino" },
      recipient: "Mario"
    )

    payload = DocumentProcessing::Presenters::ExtractedDocumentPresenter.new(doc, url_helpers: FakeUrlHelpers.new).as_json

    assert_equal doc.id, payload[:id]
    assert_equal "done", payload[:status]
    assert_equal "Mario", payload[:recipient]
    assert_equal user.email, payload[:matched_employee][:email]
    assert_equal "/documents/extracted/#{doc.id}/pdf", payload[:pdf_download_url]
  end
end
