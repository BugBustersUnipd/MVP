module DocumentProcessing
  class Ocr
    def initialize(textract_client:)
      @textract = textract_client
    end

    def page_texts_with_layout(pdf)
      pdf.pages.map { |page| layout_text(page) }
    end

    def quick_ocr(page)
      tmp_pdf = CombinePDF.new << page
      extract_line_blocks(document_bytes: tmp_pdf.to_pdf).map(&:text).join("\n")
    end

    def full_ocr(file_path)
      line_items = if pdf_file?(file_path)
        begin
          pdf = CombinePDF.load(file_path)
          pdf.pages.flat_map { |page| extract_line_items(page) }
        rescue StandardError => e
          Rails.logger.warn("PDF parse failed, fallback to direct Textract: #{e.message}")
          direct_line_items(file_path)
        end
      else
        direct_line_items(file_path)
      end

      {
        text: line_items.map { |line| line[:text] }.join("\n"),
        lines: line_items
      }
    end

    private

    def layout_text(page)
      tmp_pdf = CombinePDF.new << page
      response = @textract.analyze_document(
        document: { bytes: tmp_pdf.to_pdf },
        feature_types: ["LAYOUT"]
      )

      extract_layout_blocks(response.blocks)
    rescue StandardError => error
      Rails.logger.warn("Textract layout fallback su detect_document_text: #{error.message}")
      quick_ocr(page)
    end

    def extract_line_items(page)
      tmp_pdf = CombinePDF.new << page

      extract_line_blocks(document_bytes: tmp_pdf.to_pdf).map do |block|
        {
          text: block.text.to_s,
          confidence: block.respond_to?(:confidence) ? block.confidence.to_f : nil
        }
      end
    end

    def extract_line_blocks(document_bytes:)
      begin
        response = @textract.detect_document_text(document: { bytes: document_bytes })
        response.blocks.select { |block| block.block_type == "LINE" }
      rescue StandardError => e
        raise expired_credentials_error(:textract, e) if expired_credentials_error?(e)

        Rails.logger.warn("Textract detect_document_text failed: #{e.message}")
        []
      end
    end

    def direct_line_items(file_path)
      blocks = extract_line_blocks(document_bytes: File.binread(file_path))
      blocks.map do |block|
        {
          text: block.text.to_s,
          confidence: block.respond_to?(:confidence) ? block.confidence.to_f : nil
        }
      end
    rescue StandardError => e
      Rails.logger.warn("Direct OCR read failed for #{file_path}: #{e.message}")
      []
    end

    def pdf_file?(file_path)
      File.binread(file_path, 5) == "%PDF-"
    rescue StandardError
      false
    end

    def extract_layout_blocks(blocks)
      return "" if blocks.blank?

      blocks
        .select { |block| block.respond_to?(:text) && block.text.present? }
        .select { |block| block.block_type == "LINE" || block.block_type.to_s.start_with?("LAYOUT_") }
        .map(&:text)
        .join("\n")
    end

    def expired_credentials_error?(error)
      message = error.message.to_s.downcase
      message.include?("security token") && message.include?("expired")
    end

    def expired_credentials_error(service, error)
      RuntimeError.new("Credenziali AWS scadute (#{service}): aggiorna AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN nel backend e riavvia il container. Dettaglio: #{error.message}")
    end
  end
end
