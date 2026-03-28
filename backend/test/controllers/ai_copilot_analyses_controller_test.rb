require "test_helper"

class AiCopilotAnalysesControllerTest < ActionDispatch::IntegrationTest
  test "risponde con successo e restituisce il JSON con i dati richiesti del copilot" do
    # 1. SETUP: Creiamo le dipendenze base
    user = User.create!(
      cf: "RSSMRA80A01H501U", username: "mario.rossi", 
      email: "test@test.com", password: "pwd", 
      name: "Mario", surname: "Rossi"
    )
    company = Company.create!(name: "Test Corp")
    employee = Employee.create!(department: "IT", user: user, company: company)

    # Creiamo il file caricato (con un finto intervento umano per coprire tutte le metriche)
    uploaded_doc = UploadedDocument.create!(
      original_filename: "test.pdf", 
      employee: employee,
      storage_path: "/fake/path/test.pdf",
      checksum: "hash000",
      override_company: "Azienda Inserita a Mano" 
    )

    # Creiamo i dati estratti dall'AI per generare delle statistiche
    # Creiamo i dati estratti dall'AI per generare delle statistiche
    ExtractedDocument.create!(
      uploaded_document: uploaded_doc,
      matched_employee: user,      
      confidence: "90.0",
      process_time_seconds: 4.0,
      sequence: 1,    # <--- AGGIUNTI QUESTI TRE
      page_start: 1,  # <---
      page_end: 1,    # <---
      created_at: Time.current
    )

    # 2. ESECUZIONE: Chiamiamo la rotta corretta definita in routes.rb
    get "/ai_copilot_data_analyst"

    # 3. VERIFICA
    assert_response :success
    json_response = JSON.parse(response.body)
    
    # Controlliamo che lo status sia success
    assert_equal "success", json_response["status"]
    
    # Estraiamo i dati e verifichiamo la presenza di tutte le chiavi (in snake_case)
    # Nota: Assumiamo che il controller stia usando queste chiavi esatte per inviarle ad Angular
    dati = json_response["data"]
    assert dati.key?("average_confidence"), "Manca average_confidence"
    assert dati.key?("average_human_intervention"), "Manca average_human_intervention"
    assert dati.key?("mapping_accuracy"), "Manca mapping_accuracy"
    assert dati.key?("average_time_analyses"), "Manca average_time_analyses"
  end
end