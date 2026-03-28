require "test_helper"

class AiCopilotAnalysesDataManagerTest < ActiveSupport::TestCase
  setup do

    # Livello 4: Foglie estreme
    ProcessingItem.destroy_all
    Post.destroy_all
    Sending.destroy_all

    # Livello 3: Dati e Processi
    ProcessingRun.destroy_all
    ExtractedDocument.destroy_all
    GeneratedDatum.destroy_all

    # Livello 2: Documenti Base e Configurazioni
    UploadedDocument.destroy_all
    Tone.destroy_all
    Style.destroy_all

    # Livello 1: Anagrafiche
    Employee.destroy_all
    User.destroy_all
    Company.destroy_all

    # 1. Creiamo le anagrafiche base con le colonne corrette
    @user = User.create!(
      cf: "RSSMRA80A01H501U", username: "mario.rossi",
      email: "test@test.com", password: "pwd",
      name: "Mario", surname: "Rossi"
    )
    @company = Company.create!(name: "Test Corp")
    @employee = Employee.create!(department: "IT", user: @user, company: @company)

    # 2. Testiamo l'INTERVENTO UMANO (Sovrascritture su UploadedDocument)
    # Creiamo 3 documenti caricati: 2 con intervento umano, 1 senza.
    @up_doc_1 = UploadedDocument.create!(
      original_filename: "doc1.pdf", employee: @employee, created_at: Time.current,
      storage_path: "/fake/path/1.pdf", checksum: "hash123",
      override_company: "Azienda Corretta a mano"
    )
    @up_doc_2 = UploadedDocument.create!(
      original_filename: "doc2.pdf", employee: @employee, created_at: Time.current,
      storage_path: "/fake/path/2.pdf", checksum: "hash456",
      override_department: "HR"
    )
    @up_doc_3 = UploadedDocument.create!(
      original_filename: "doc3.pdf", employee: @employee, created_at: Time.current,
      storage_path: "/fake/path/3.pdf", checksum: "hash789"
    )

    # Documento Estratto 1: Mappato correttamente
    @ext_doc_mappato = ExtractedDocument.create!(
      uploaded_document: @up_doc_1,
      matched_employee: @user,
      # Mettiamo un JSON con due campi. Media di questo doc = 95.0
      confidence: { "nome_azienda" => 90.0, "partita_iva" => 100.0 }.to_json,
      process_time_seconds: 4.0,
      sequence: 1, page_start: 1, page_end: 1,
      created_at: Time.current
    )

    # Documento Estratto 2: NON Mappato
    @ext_doc_non_mappato = ExtractedDocument.create!(
      uploaded_document: @up_doc_2,
      matched_employee: nil,
      # Mettiamo un JSON con un solo campo. Media di questo doc = 80.0
      confidence: { "totale_fattura" => 80.0 }.to_json,
      process_time_seconds: 2.0,
      sequence: 2, page_start: 2, page_end: 2,
      created_at: Time.current
    )

    @manager = AiAnalyst::Managers::AiCopilotAnalysesDataManager.new(start_date: 1.day.ago, end_date: 1.day.from_now)
  end

  test "calcola correttamente l'accuratezza del mapping (mapping_accuracy)" do
    # 1 documento estratto mappato su 2 totali = 50.0%
    assert_equal 50.0, @manager.retrieve_mapping_accuracy_query
  end

  test "calcola correttamente la media della confidenza (average_confidence_value)" do
    # (100.0 + 90.0 + 80.0) / 3 = 90.0
    assert_equal 90.0, @manager.retrieve_average_confidence_value_query
  end

  test "calcola correttamente il tempo medio di analisi (average_time_analyses)" do
    # (4.0 + 2.0) / 2 = 3.0
    assert_equal 3.0, @manager.retrieve_average_time_analyses_query
  end

  test "conta correttamente gli interventi umani (human_intervention_value)" do
    # Abbiamo creato 3 UploadedDocument, ma solo 2 hanno gli override (company o department) compilati
    assert_equal 2, @manager.retrieve_human_intervention_value_query
  end
end
