require "test_helper"

class CsvProcessorTest < ActiveSupport::TestCase
  test "parse returns rows as hashes" do
    temp = Tempfile.new(["rows", ".csv"])
    temp.write("recipient,amount\nMario Rossi,100\nGiulia Bianchi,200\n")
    temp.rewind

    rows = DocumentProcessing::CsvProcessor.new(data_extractor: nil, recipient_resolver: nil).parse(temp.path)

    assert_equal 2, rows.size
    assert_equal "Mario Rossi", rows[0]["recipient"]
    assert_equal "200", rows[1]["amount"]
  ensure
    temp.close!
  end

  test "call returns nil when all rows are empty" do
    temp = Tempfile.new(["empty", ".csv"])
    temp.write("col1,col2\n,\n,\n")
    temp.rewind

    result = DocumentProcessing::CsvProcessor.new(data_extractor: nil, recipient_resolver: nil).call(temp.path)
    assert_nil result
  ensure
    temp.close!
  end

  test "call returns nil when file has only headers" do
    temp = Tempfile.new(["headers", ".csv"])
    temp.write("recipient,amount\n")
    temp.rewind

    result = DocumentProcessing::CsvProcessor.new(data_extractor: nil, recipient_resolver: nil).call(temp.path)
    assert_nil result
  ensure
    temp.close!
  end

  test "call calls extractor and resolver" do
    temp = Tempfile.new(["data", ".csv"])
    temp.write("recipient,amount\nMario Rossi,100\n")
    temp.rewind

    fake_extractor = Object.new
    fake_extractor.define_singleton_method(:extract) do |_text|
      { recipients: ["Mario Rossi"], metadata: { "company" => "ACME" }, llm_confidence: { recipient: 0.9 } }
    end

    fake_resolution = Object.new
    fake_resolution.define_singleton_method(:matched?) { true }
    fake_resolution.define_singleton_method(:employee) { nil }

    fake_resolver = Object.new
    fake_resolver.define_singleton_method(:resolve) { |**_kwargs| fake_resolution }

    processor = DocumentProcessing::CsvProcessor.new(data_extractor: fake_extractor, recipient_resolver: fake_resolver)
    result = processor.call(temp.path)

    assert_not_nil result
    assert_equal "Mario Rossi", result[:recipient]
    assert_equal "ACME", result[:metadata]["company"]
  ensure
    temp.close!
  end

  test "call returns nil employee when resolution is unmatched" do
    temp = Tempfile.new(["data2", ".csv"])
    temp.write("recipient,amount\nGiulia Bianchi,200\n")
    temp.rewind

    fake_extractor = Object.new
    fake_extractor.define_singleton_method(:extract) do |_text|
      { recipients: ["Giulia Bianchi"], metadata: {}, llm_confidence: {} }
    end

    fake_resolution = Object.new
    fake_resolution.define_singleton_method(:matched?) { false }
    fake_resolution.define_singleton_method(:employee) { nil }

    fake_resolver = Object.new
    fake_resolver.define_singleton_method(:resolve) { |**_kwargs| fake_resolution }

    processor = DocumentProcessing::CsvProcessor.new(data_extractor: fake_extractor, recipient_resolver: fake_resolver)
    result = processor.call(temp.path)

    assert_not_nil result
    assert_nil result[:employee]
  ensure
    temp.close!
  end
end
