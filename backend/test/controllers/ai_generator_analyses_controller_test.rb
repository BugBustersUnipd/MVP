require "test_helper"

class AiGeneratorAnalysesControllerTest < ActionDispatch::IntegrationTest
  test "risponde con successo e restituisce il JSON con i dati richiesti del generatore" do
    # 1. SETUP: Usiamo le colonne corrette per le anagrafiche
    company = Company.create!(name: "Test Company") # Corretto business_name -> name
    tono = Tone.create!(name: "Professionale", company: company)
    stile = Style.create!(name: "Conciso", company: company)
    
    # Creiamo un dato generato valido
    GeneratedDatum.create!(
      title: "Test", 
      prompt: "Testo di prova per il prompt", # Corretto prompt_amount -> prompt (testo)
      rating: 8.0, 
      company: company,
      tone: tono,
      style: stile,
      created_at: Time.current
    )

    # 2. ESECUZIONE: Chiamiamo la rotta
    get "/ai_generator_data_analyst"

    # 3. VERIFICA
    assert_response :success
    json_response = JSON.parse(response.body)
    
    assert_equal "success", json_response["status"]
    
    dati = json_response["data"]
    
    # Controlliamo la presenza delle chiavi nel JSON di risposta
    assert dati.key?("prompt_amount"), "Manca prompt_amount"
    assert dati.key?("average_rate_prompt"), "Manca average_rate_prompt"
    assert dati.key?("average_regeneration_amount"), "Manca average_regeneration_amount"
    assert dati.key?("tone_usage"), "Manca tone_usage"
    assert dati.key?("style_usage"), "Manca style_usage"
  end
end