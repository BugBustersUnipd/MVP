require "base64"
require "tempfile"

class PageRangePdfTest < ActiveSupport::TestCase
  ONE_PAGE_PDF_BASE64 = "JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDIwMCAyMDBdIC9Db250ZW50cyA0IDAgUiAvUmVzb3VyY2VzIDw8Pj4+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggMTI+PgpzdHJlYW0KQlQKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAyMzAgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUgL1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjkxCiUlRU9G"

  # Crea un PDF temporaneo e lo rimuove dopo l'uso del test.
  def with_fake_pdf
    temp = Tempfile.new(["source", ".pdf"])
    temp.binmode
    temp.write(Base64.decode64(ONE_PAGE_PDF_BASE64))
    temp.flush
    yield temp.path
  ensure
    temp.close!
  end

  test "build_temp_pdf creates pdf for valid range" do
    with_fake_pdf do |source|
      service = DocumentProcessing::PageRangePdf.new(source_pdf_path: source)
      output = service.build_temp_pdf(page_start: 1, page_end: 1)
      assert File.exist?(output)
      File.delete(output) if File.exist?(output)
    end
  end

  test "build_temp_pdf raises on invalid range" do
    with_fake_pdf do |source|
      service = DocumentProcessing::PageRangePdf.new(source_pdf_path: source)
      assert_raises(ArgumentError) { service.build_temp_pdf(page_start: 2, page_end: 1) }
    end
  end

  test "build_temp_pdf raises when page_start is zero" do
    with_fake_pdf do |source|
      service = DocumentProcessing::PageRangePdf.new(source_pdf_path: source)
      assert_raises(ArgumentError) { service.build_temp_pdf(page_start: 0, page_end: 1) }
    end
  end

  test "build_temp_pdf raises when page_end exceeds total pages" do
    with_fake_pdf do |source|
      
      service = DocumentProcessing::PageRangePdf.new(source_pdf_path: source)
      assert_raises(ArgumentError) { service.build_temp_pdf(page_start: 1, page_end: 5) }
    end
  end

  test "build_temp_pdf raises when page_start is not an integer" do
    with_fake_pdf do |source|
      service = DocumentProcessing::PageRangePdf.new(source_pdf_path: source)
      assert_raises(ArgumentError) { service.build_temp_pdf(page_start: "one", page_end: 1) }
    end
  end
end