require "test_helper"

class ImageParamsSetterServiceTest < ActiveSupport::TestCase
  # === CASO NORMALE ===
  test "valida con parametri validi" do
    params = {
      prompt: "Un paesaggio montagnoso al tramonto",
      width: 1024,
      height: 1024,
      seed: 42
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert setter.valid?
    assert_empty setter.getData[:errors]
  end

  test "costruisce JSON prompt correttamente" do
    params = {
      prompt: "Un'immagine di un gatto",
      width: 1024,
      height: 1024,
      seed: 123
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    json_prompt = setter.buildImagePrompt("Testo generato")
    
    parsed = JSON.parse(json_prompt)
    
    assert_equal "TEXT_IMAGE", parsed["taskType"]
    assert_equal 1, parsed["imageGenerationConfig"]["numberOfImages"]
    assert_equal 1024, parsed["imageGenerationConfig"]["height"]
    assert_equal 1024, parsed["imageGenerationConfig"]["width"]
    assert_equal 7.0, parsed["imageGenerationConfig"]["cfgScale"]
    assert_equal 123, parsed["imageGenerationConfig"]["seed"]
  end

  # === VALIDAZIONI - DIMENSIONI ===
  test "valida dimensioni 1024x1024" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert setter.valid?
  end

  test "valida dimensioni 1280x720" do
    params = {
      prompt: "Test",
      width: 1280,
      height: 720
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert setter.valid?
  end

  test "valida dimensioni 720x1280" do
    params = {
      prompt: "Test",
      width: 720,
      height: 1280
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert setter.valid?
  end

  test "invalida dimensioni non supportate" do
    params = {
      prompt: "Test",
      width: 512,
      height: 512
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors].first, "Dimensioni non supportate"
    assert_includes setter.getData[:errors].first, "1024x1024"
    assert_includes setter.getData[:errors].first, "1280x720"
    assert_includes setter.getData[:errors].first, "720x1280"
  end

  test "invalida width sbagliato con height corretto" do
    params = {
      prompt: "Test",
      width: 800,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert_not setter.valid?
  end

  test "invalida height sbagliato con width corretto" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 800
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert_not setter.valid?
  end

  # === VALIDAZIONE PROMPT ===
  test "invalida se prompt è vuoto" do
    params = {
      prompt: "",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors].first, "prompt e company_id sono obbligatori"
  end

  test "invalida se prompt è nil" do
    params = {
      prompt: nil,
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert_not setter.valid?
  end

  test "invalida se prompt è solo spazi" do
    params = {
      prompt: "   ",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert_not setter.valid?
  end

  # === DEFAULT VALUES ===
  test "usa default width 1024 se non fornito" do
    params = {
      prompt: "Test",
      width: nil,
      height: nil
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    data = setter.getData
    
    assert_equal 1024, data[:width]
    assert_equal 1024, data[:height]
  end

  test "usa default seed randomico se non fornito" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024,
      seed: nil
    }
    
    setter1 = AiGenerator::ImageParamsSetterService.new(params)
    setter2 = AiGenerator::ImageParamsSetterService.new(params)
    
    # I seed dovrebbero essere diversi (con altissima probabilità)
    assert_not_equal setter1.getData[:seed], setter2.getData[:seed]
  end

  test "seed randomico rientra nel range valido (0 a 2^31-1)" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024,
      seed: nil
    }
    
    10.times do
      setter = AiGenerator::ImageParamsSetterService.new(params)
      seed = setter.getData[:seed]
      
      assert seed >= 0
      assert seed <= 2_147_483_647
    end
  end

  # === CONVERSIONE TIPI ===
  test "converte width e height da string a integer" do
    params = {
      prompt: "Test",
      width: "1024",
      height: "1024",
      seed: "42"
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    data = setter.getData
    
    assert_kind_of Integer, data[:width]
    assert_kind_of Integer, data[:height]
    assert_kind_of Integer, data[:seed]
  end

  # === EDGE CASES ===
  test "gestisce prompt molto lungo" do
    long_prompt = "a" * 2000
    params = {
      prompt: long_prompt,
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    json_prompt = setter.buildImagePrompt("Testo")
    
    # Controlla che il prompt è troncato a 1000 caratteri
    parsed = JSON.parse(json_prompt)
    assert parsed["textToImageParams"]["text"].length <= 1000
  end

  test "gestisce prompt con caratteri speciali" do
    params = {
      prompt: "Un'immagine con 中文, émojis 🎨 e special chars !@#$%",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    
    assert setter.valid?
  end

  test "combina prompt utente e testo generato nell'output" do
    params = {
      prompt: "Crea un'immagine con",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    json_prompt = setter.buildImagePrompt("un tramonto bellissimo")
    
    parsed = JSON.parse(json_prompt)
    prompt_text = parsed["textToImageParams"]["text"]
    
    assert_includes prompt_text, "Crea un'immagine con"
    assert_includes prompt_text, "un tramonto bellissimo"
  end

  # === JSON OUTPUT ===
  test "buildImagePrompt ritorna JSON valido" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024,
      seed: 100
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    json_output = setter.buildImagePrompt("Testo")
    
    # Non dovrebbe sollevare eccezione
    parsed = JSON.parse(json_output)
    assert_kind_of Hash, parsed
  end

  test "JSON prompt include negative text filter" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    json_prompt = setter.buildImagePrompt("Testo")
    
    parsed = JSON.parse(json_prompt)
    negative_text = parsed["textToImageParams"]["negativeText"]
    
    assert_includes negative_text, "low quality"
    assert_includes negative_text, "bad anatomy"
    assert_includes negative_text, "watermark"
  end

  test "cfgScale è 7.0 (configurable parameter)" do
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    json_prompt = setter.buildImagePrompt("Testo")
    
    parsed = JSON.parse(json_prompt)
    
    assert_equal 7.0, parsed["imageGenerationConfig"]["cfgScale"]
  end

  # === METODO getData ===
  test "getData ritorna width height e seed" do
    params = {
      prompt: "Test",
      width: 1280,
      height: 720,
      seed: 999
    }
    
    setter = AiGenerator::ImageParamsSetterService.new(params)
    data = setter.getData
    
    assert_equal 1280, data[:width]
    assert_equal 720, data[:height]
    assert_equal 999, data[:seed]
  end
end
