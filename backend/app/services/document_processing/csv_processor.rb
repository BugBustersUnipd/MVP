require "csv"

module DocumentProcessing
  class CsvProcessor
    
    def initialize(data_extractor:, recipient_resolver:)
      @data_extractor = data_extractor
      @recipient_resolver = recipient_resolver
    end

    # Estrae e prepara i dati utili al processamento.
    def parse(file_path)
      text = File.read(file_path)
      CSV.parse(text, headers: true).map(&:to_h)
    end

    # Processa il csv e restituisce un hash con i dati estratti, la confidenza, il destinatario risolto e l'eventuale employee associato
    def call(file_path)
      rows = parse(file_path)
      non_empty_rows = rows.reject { |row| row.values.all? { |v| v.nil? || v.to_s.strip.empty? } }
      return nil if non_empty_rows.empty?

      raw_text = non_empty_rows.map { |row| row.values.compact.join(" ").strip }.reject(&:empty?).join("\n")
      return nil if raw_text.empty?

      extracted = @data_extractor.extract(raw_text)
      recipient_names = extracted[:recipients]
      recipient = Array(recipient_names).compact.first
      confidence = extracted[:llm_confidence]
      metadata = extracted[:metadata]

      resolution = @recipient_resolver.resolve(recipient_names: recipient_names, raw_text: raw_text)

      {
        ocr_text: nil,
        metadata: metadata || {},
        confidence: confidence || {},
        recipient: recipient,
        employee: resolution.matched? ? resolution.employee : nil
      }
    end
  end
end
