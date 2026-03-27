require "test_helper"

class DocumentProcessingRecipientResolverTest < ActiveSupport::TestCase
  setup do
    @service = DocumentProcessing::RecipientResolver.new
  end

  def resolve_result(recipient_names:, raw_text: nil, service: @service)
    service.resolve(recipient_names:, raw_text:)
  end

  # ---------------------------------------------------------------------------
  # Match esatto
  # ---------------------------------------------------------------------------

  test "ritorna employee con match esatto" do
    result = resolve_result(recipient_names: ["Mario Rossi"])
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee
  end

  test "match esatto case-insensitive" do
    result = resolve_result(recipient_names: ["MARIO ROSSI"])
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee
  end

  test "match esatto con ordine token invertito" do
    result = resolve_result(recipient_names: ["Rossi Mario"])
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee
  end

  # ---------------------------------------------------------------------------
  # Near-exact — nome nel DB con titolo o prefisso extra
  # ---------------------------------------------------------------------------

  test "trova mario rossi anche se nel DB c'e' un prefisso extra (token-set containment)" do
    user = users(:mario_rossi)
    user.update!(name: "Dott. Mario Rossi")

    result = resolve_result(recipient_names: ["Mario Rossi"])
    assert result.matched?
    assert_equal user, result.employee
  ensure
    users(:mario_rossi).update!(name: "Mario Rossi")
  end

  # ---------------------------------------------------------------------------
  # Typo OCR — 1 carattere sbagliato su ogni token
  # ---------------------------------------------------------------------------

  test "typo OCR: maria rossi → Mario Rossi" do
    result = resolve_result(recipient_names: ["Maria Rossi"])
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee,
      "Atteso Mario Rossi per typo 'Maria Rossi', got: #{result.inspect}"
  end

  test "typo OCR: mario rosso → Mario Rossi" do
    result = resolve_result(recipient_names: ["Mario Rosso"])
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee,
      "Atteso Mario Rossi per typo 'Mario Rosso', got: #{result.inspect}"
  end

  test "typo OCR: maria rosso → Mario Rossi (entrambi i token errati)" do
    result = resolve_result(recipient_names: ["Maria Rosso"])
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee,
      "Atteso Mario Rossi per typo 'Maria Rosso', got: #{result.inspect}"
  end

  # ---------------------------------------------------------------------------
  # Nomi con accenti/diacritici
  # ---------------------------------------------------------------------------

  test "trova Klaus Muller anche scritto senza umlaut" do
    result = resolve_result(recipient_names: ["Klaus Muller"])
    assert result.matched?
    assert_equal users(:mueller), result.employee
  end

  test "trova Eric Blanc anche senza accento" do
    result = resolve_result(recipient_names: ["Eric Blanc"])
    assert result.matched?
    assert_equal users(:eric_blanc), result.employee
  end

  # ---------------------------------------------------------------------------
  # Nessun match → ritorna stringa grezza
  # ---------------------------------------------------------------------------

  test "ritorna stringa grezza se nessun dipendente e' abbastanza simile" do
    result = resolve_result(recipient_names: ["Zxcvbn Qwerty"])
    assert result.unmatched?
    assert_equal "Zxcvbn Qwerty", result.fallback_text
  end

  test "nessuna confusione tra rossi e rossini" do
    result = resolve_result(recipient_names: ["Marco Rossi"])
    refute_equal users(:giovanni_rossini), result.employee
  end

  # ---------------------------------------------------------------------------
  # raw_text come fallback di ricerca
  # ---------------------------------------------------------------------------

  test "usa raw_text se recipient_names e' vuoto" do
    result = resolve_result(recipient_names: [], raw_text: "Mario Rossi")
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee
  end

  test "usa raw_text se recipient_names e' nil" do
    result = resolve_result(recipient_names: nil, raw_text: "Mario Rossi")
    assert result.matched?
    assert_equal users(:mario_rossi), result.employee
  end

  test "ritorna raw_text grezzo se non trova match dal raw_text" do
    testo = "Spett.le Zxcvbn Qwerty"
    result = resolve_result(recipient_names: [], raw_text: testo)
    assert result.unmatched?
    assert_equal testo, result.fallback_text
  end

  test "testo molto lungo non matcha un dipendente per caso" do
    testo_lungo = "Egregio Dottore, con la presente siamo a comunicarle che " \
                  "il progetto annuale e' stato completato nei tempi previsti. " \
                  "Cordiali saluti, La Direzione Generale dell'Azienda SpA"
    result = resolve_result(recipient_names: [], raw_text: testo_lungo)
    refute result.matched?
  end

  # ---------------------------------------------------------------------------
  # Edge cases
  # ---------------------------------------------------------------------------

  test "ritorna empty se non c'e' nessun testo" do
    result1 = resolve_result(recipient_names: [])
    result2 = resolve_result(recipient_names: nil)
    result3 = resolve_result(recipient_names: [], raw_text: nil)

    assert result1.empty?
    assert result2.empty?
    assert result3.empty?
  end

  test "prende il best match tra piu' recipient_names" do
    result = resolve_result(recipient_names: ["Mario Rosso", "Luigi Bianchi"])
    assert result.matched?
    assert_equal users(:luigi_bianchi), result.employee
  end

  test "soglia personalizzata piu' bassa accetta match meno precisi" do
    service_permissivo = DocumentProcessing::RecipientResolver.new(threshold: 0.50)
    result = resolve_result(recipient_names: ["M. Rossi"], service: service_permissivo)
    assert result.matched?
    assert_kind_of User, result.employee
  end

  test "soglia personalizzata molto alta rifiuta match parziali" do
    service_severo = DocumentProcessing::RecipientResolver.new(threshold: 0.99)
    result = resolve_result(recipient_names: ["Maria Rossi"], service: service_severo)
    refute_equal users(:mario_rossi), result.employee
  end
end
