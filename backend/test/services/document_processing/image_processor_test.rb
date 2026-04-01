require "test_helper"

class ImageProcessorTest < ActiveSupport::TestCase
  class FakeOcrService
    # Esegue OCR fittizio e restituisce il testo.
    def full_ocr(_file_path)
      { text: "Mario Rossi fattura 123" }
    end
  end

  class FakeDataExtractor
    # Estrae e prepara i dati utili al processamento.
    def extract(_text)
      {
        recipients: ["Mario Rossi"],
        metadata: { "type" => "fattura" },
        llm_confidence: { "recipient" => 0.9 }
      }
    end
  end

  class FakeResolution
    # Inizializza le dipendenze del componente.
    def initialize(employee)
      @employee = employee
    end

    # Verifica le condizioni richieste prima di procedere.
    def matched?
      @employee.present?
    end

    attr_reader :employee
  end

  class FakeRecipientResolver
    # Chiama resolve e restituisce una risoluzione fittizio.
    def resolve(recipient_names:, raw_text:)
      employee = User.new(id: 1, name: recipient_names.first, email: "mario@example.com", username: "mario")
      FakeResolution.new(employee)
    end
  end

  class FakeContainer
    # Restituisce il servizio OCR fittizio.
    def ocr_service
      FakeOcrService.new
    end

    # Restituisce l'estrattore dati fittizio.
    def data_extractor
      FakeDataExtractor.new
    end

    # Restituisce il resolver fittizio per i destinatari.
    def recipient_resolver
      FakeRecipientResolver.new
    end
  end

  test "extract returns normalized payload" do
    processor = DocumentProcessing::ImageProcessor.new(
      ocr_service: FakeOcrService.new,
      data_extractor: FakeDataExtractor.new,
      recipient_resolver: FakeRecipientResolver.new
    )

    result = processor.call("/tmp/fake.png")

    assert_equal "Mario Rossi", result[:recipient]
    assert_equal "fattura", result[:metadata]["type"]
    assert_equal 0.9, result[:confidence]["recipient"]
    assert_equal "mario@example.com", result[:employee].email
  end

  test "extract returns nil employee when resolution is unmatched" do
    unmatched_resolver = Object.new
    unmatched_resolution = Object.new
    unmatched_resolution.define_singleton_method(:matched?) { false }
    unmatched_resolution.define_singleton_method(:employee) { nil }
    unmatched_resolver.define_singleton_method(:resolve) { |**_| unmatched_resolution }

    processor = DocumentProcessing::ImageProcessor.new(
      ocr_service: FakeOcrService.new,
      data_extractor: FakeDataExtractor.new,
      recipient_resolver: unmatched_resolver
    )

    result = processor.call("/tmp/fake.png")

    assert_nil result[:employee]
    assert_equal "Mario Rossi", result[:recipient]
  end
end
