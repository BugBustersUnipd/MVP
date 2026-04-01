require "test_helper"

class ConfidenceCalculatorTest < ActiveSupport::TestCase
  test "global_confidence merges llm and textract confidences" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [
        { text: "Mario Rossi", confidence: 80 },
        { text: "ACME SPA", confidence: 90 },
        { text: "15/03/2026", confidence: 70 }
      ],
      recipient_names: ["Mario Rossi"],
      metadata: { date: "2026-03-15", company: "ACME SPA", department: nil, reason: nil, competence: nil },
      llm_confidence: { recipient: 0.6, date: 0.5, company: 0.4, department: 0.2, type: 0.9, reason: 0.0, competence: 0.0 }
    )

    result = calculator.global_confidence

    assert_equal 0.7, result[:recipient]
    assert_equal 0.6, result[:date]
    assert_equal 0.65, result[:company]
    assert_equal 0.9, result[:type]
  end

  test "overrides force confidence to 1.0" do
    uploaded = UploadedDocument.new(
      override_company: "X",
      override_department: "Y",
      category: "Z",
      competence_period: "2026-01"
    )

    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [],
      recipient_names: [],
      metadata: {},
      llm_confidence: {},
      uploaded_document: uploaded
    )

    result = calculator.global_confidence

    assert_equal 1.0, result[:company]
    assert_equal 1.0, result[:department]
    assert_equal 1.0, result[:type]
    assert_equal 1.0, result[:competence]
  end

  test "returns 0.0 for fields with no values to match" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [{ text: "Mario Rossi", confidence: 90 }],
      recipient_names: [],
      metadata: { company: nil, date: nil, department: nil },
      llm_confidence: {}
    )

    result = calculator.global_confidence

    assert_equal 0.0, result[:recipient]
    assert_equal 0.0, result[:company]
  end

  test "returns 0.0 when no lines match the values" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [{ text: "Testo non correlato", confidence: 80 }],
      recipient_names: ["Mario Rossi"],
      metadata: { company: "ACME" },
      llm_confidence: {}
    )

    result = calculator.global_confidence

    assert_equal 0.0, result[:recipient]
    assert_equal 0.0, result[:company]
  end

  test "skips lines with nil confidence" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [
        { text: "Mario Rossi", confidence: nil },
        { text: "Mario Rossi", confidence: 80 }
      ],
      recipient_names: ["Mario Rossi"],
      metadata: {},
      llm_confidence: {}
    )

    result = calculator.global_confidence

    
    assert_in_delta 0.4, result[:recipient], 0.01
  end

  test "date_candidates generates ISO and locale variants" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [{ text: "15/03/2026", confidence: 90 }],
      recipient_names: [],
      metadata: { date: "2026-03-15" },
      llm_confidence: { date: 0.5 }
    )

    result = calculator.global_confidence

    
    assert result[:date] > 0
  end

  test "nil llm_confidence value falls back to 0.0" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [],
      recipient_names: [],
      metadata: {},
      llm_confidence: { type: nil }
    )

    result = calculator.global_confidence

    assert_equal 0.0, result[:type]
  end

  test "uploaded_document nil does not apply overrides" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [],
      recipient_names: [],
      metadata: {},
      llm_confidence: { company: 0.5 },
      uploaded_document: nil
    )

    result = calculator.global_confidence

    assert_equal 0.25, result[:company]
  end

  test "uploaded_document with blank overrides does not force 1.0" do
    uploaded = UploadedDocument.new(
      override_company: nil,
      override_department: "",
      category: nil,
      competence_period: nil
    )

    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [],
      recipient_names: [],
      metadata: {},
      llm_confidence: { company: 0.4 },
      uploaded_document: uploaded
    )

    result = calculator.global_confidence

    # No override present → company stays at merged value, not forced to 1.0
    assert result[:company] < 1.0
  end

  test "skips ocr lines with blank text" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [
        { text: "", confidence: 95 },
        { text: "   ", confidence: 95 },
        { text: "Mario Rossi", confidence: 80 }
      ],
      recipient_names: ["Mario Rossi"],
      metadata: {},
      llm_confidence: {}
    )

    result = calculator.global_confidence

    # solo "Mario Rossi" line counts (blank lines skipped)
    assert result[:recipient] > 0
  end

  test "date_candidates with non-ISO date does not generate extra variants" do
    calculator = DocumentProcessing::ConfidenceCalculator.new(
      ocr_lines: [{ text: "March 2026", confidence: 80 }],
      recipient_names: [],
      metadata: { date: "March 2026" },
      llm_confidence: {}
    )

    result = calculator.global_confidence

    
    assert_includes [0.0, 0.4, 0.8], result[:date].round(1)
  end
end
