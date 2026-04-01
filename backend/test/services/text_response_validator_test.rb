require "test_helper"
require_relative "../../app/services/ai_generator/text_response_validator"

class TextResponseValidatorTest < ActiveSupport::TestCase
  # Preparazione dati di test.
  def setup
    @validator = AiGenerator::TextResponseValidator.new
  end

  test "parse! solleva errore per messaggio bloccante linee guida" do
    blocked = "Siamo spiacenti, la domanda non rispetta le linee guida."

    error = assert_raises(AiGenerator::TextResponseValidator::BlockedResponseError) do
      @validator.parse!(blocked, 10)
    end

    assert_equal blocked, error.message
  end

  test "parse! solleva errore per messaggio bloccante modello" do
    blocked = "Siamo spiacenti, il modello non può rispondere a questa domanda."

    error = assert_raises(AiGenerator::TextResponseValidator::BlockedResponseError) do
      @validator.parse!(blocked, 10)
    end

    assert_equal blocked, error.message
  end

  test "parse! estrae titolo e testo dal formato con pipe" do
    parsed = @validator.parse!("Titolo | Corpo del testo", 5)

    assert_equal "Titolo", parsed[:title]
    assert_equal "Corpo del testo", parsed[:text]
  end

  test "parse! usa fallback su titolo default quando non trova pipe" do
    parsed = @validator.parse!("Solo contenuto", 7)

    assert_equal "Solo contenuto", parsed[:title]
    assert_equal "Solo contenuto", parsed[:text]
  end
end
