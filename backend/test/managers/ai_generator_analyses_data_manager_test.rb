require "test_helper"

class AiGeneratorAnalysesDataManagerTest < ActiveSupport::TestCase
  # Il blocco setup prepara i dati finti prima di OGNI test
  setup do
    # 1. Corretto 'business_name' in 'name'
    @company = Company.create!(name: "Test Company")
    @tone = Tone.create!(name: "Professionale", company: @company)
    @style = Style.create!(name: "Conciso", company: @company)
    
    # 1. Contenuto Originale
    @parent_content = GeneratedDatum.create!(
      title: "Testo Originale", 
      prompt: "Primo prompt di prova inviato all'AI", # Inserito il testo per poterlo contare
      rating: 8.0, 
      tone: @tone, style: @style, company: @company, created_at: Time.current
    )
    
    # 2. Contenuto Rigenerato (Versione figlia)
    GeneratedDatum.create!(
      title: "Versione 2", 
      prompt: "Secondo prompt di rigenerazione", # Inserito il testo per poterlo contare
      rating: 9.0, 
      tone: @tone, style: @style, company: @company, 
      version: @parent_content, # Corretto 'parent' in 'version'
      created_at: Time.current
    )

    # Inizializziamo il manager con un range di date ampio
    @manager = AiGeneratorAnalysesDataManager.new(start_date: 1.day.ago, end_date: 1.day.from_now)
  end

  test "calcola correttamente il CONTEGGIO totale dei prompt usati" do
    # Non facciamo più la somma 5+2, ma contiamo semplicemente le tuple con prompt!
    # Ne abbiamo create 2 con prompt compilato, quindi ci aspettiamo 2.
    assert_equal 2, @manager.retrieve_prompt_amount_query
  end

  test "calcola correttamente la media del rating (average_rate_prompt)" do
    # (8.0 + 9.0) / 2 = 8.5
    assert_equal 8.5, @manager.retrieve_average_rate_prompt_query
  end

  test "calcola correttamente il rateo di rigenerazione" do
    # Abbiamo 1 contenuto originale (version: nil) e 1 rigenerazione (version compilata). 
    # Media = 1.0 / 1.0 = 1.0
    assert_equal 1.0, @manager.retrieve_average_regeneration_amount_query
  end

  test "restituisce l'hash con l'utilizzo dei toni" do
    # Entrambi i contenuti usano il tono "Professionale", quindi il count è 2
    risultato_atteso = { "Professionale" => 2 }
    assert_equal risultato_atteso, @manager.retrieve_tone_usage_query
  end

  test "restituisce l'hash con l'utilizzo degli stili" do
    # Entrambi usano lo stile "Conciso", count è 2
    risultato_atteso = { "Conciso" => 2 }
    assert_equal risultato_atteso, @manager.retrieve_style_usage_query
  end
end