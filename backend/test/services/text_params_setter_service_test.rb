require "test_helper"

class TextParamsSetterServiceTest < ActiveSupport::TestCase
  # === CASO NORMALE ===
  test "valida con parametri completi e corretti" do
    params = {
      prompt: "Scrivi un'email",
      toneDescription: "Professionale e cortese",
      styleDescription: "Ufficio moderno",
      companyName: "Acme Corp",
      companyDescription: "Agenzia digitale innovativa"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert setter.valid?
    assert_empty setter.getData[:errors]
  end

  test "costruisce system prompt correttamente" do
    params = {
      prompt: "Scrivi un'email",
      toneDescription: "Formale",
      styleDescription: "Minimalista",
      companyName: "TechStart",
      companyDescription: "Software house"
    }
    
    setter = TextParamsSetterService.new(params)
    system_prompt = setter.buildSystemPrompt
    
    assert_includes system_prompt, "TechStart"
    assert_includes system_prompt, "Software house"
    assert_includes system_prompt, "Formale"
    assert_includes system_prompt, "Minimalista"
    assert_includes system_prompt, "RUOLO:"
    assert_includes system_prompt, "CONTESTO:"
    assert_includes system_prompt, "TONO"
    assert_includes system_prompt, "STILE"
  end

  # === VALIDAZIONI - CAMPI OBBLIGATORI ===
  test "invalida se prompt è vuoto" do
    params = {
      prompt: "",
      toneDescription: "Professionale",
      styleDescription: "Ufficio",
      companyName: "Acme",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors], "prompt è obbligatorio"
  end

  test "invalida se prompt è nil" do
    params = {
      prompt: nil,
      toneDescription: "Professionale",
      styleDescription: "Ufficio",
      companyName: "Acme",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors], "prompt è obbligatorio"
  end

  test "invalida se companyName è vuoto" do
    params = {
      prompt: "Scrivi un'email",
      toneDescription: "Professionale",
      styleDescription: "Ufficio",
      companyName: "",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors], "companyName è obbligatorio"
  end

  test "invalida se toneDescription è vuoto" do
    params = {
      prompt: "Scrivi un'email",
      toneDescription: "",
      styleDescription: "Ufficio",
      companyName: "Acme",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors], "toneDescription è obbligatorio"
  end

  test "invalida se styleDescription è vueto" do
    params = {
      prompt: "Scrivi un'email",
      toneDescription: "Professionale",
      styleDescription: "",
      companyName: "Acme",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors], "styleDescription è obbligatorio"
  end

  test "invalida se companyDescription è vuoto" do
    params = {
      prompt: "Scrivi un'email",
      toneDescription: "Professionale",
      styleDescription: "Ufficio",
      companyName: "Acme",
      companyDescription: ""
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_includes setter.getData[:errors], "companyDescription è obbligatorio"
  end

  test "invalida se mancano più campi" do
    params = {
      prompt: nil,
      toneDescription: nil,
      styleDescription: "Ufficio",
      companyName: "",
      companyDescription: ""
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_not setter.valid?
    assert_equal 4, setter.getData[:errors].length
  end

  # === EDGE CASES ===
  test "valida con spazi bianchi in prompt" do
    params = {
      prompt: "   Scrivi un'email   ",
      toneDescription: "Professionale",
      styleDescription: "Ufficio",
      companyName: "Acme",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert setter.valid?
  end

  test "valida con prompts molto lunghi" do
    long_prompt = "a" * 5000
    params = {
      prompt: long_prompt,
      toneDescription: "Professionale",
      styleDescription: "Ufficio",
      companyName: "Acme",
      companyDescription: "Agenzia"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert setter.valid?
    system_prompt = setter.buildSystemPrompt
    assert_includes system_prompt, "a" * 1000 # Parte del prompt lungo è inclusa
  end

  test "valida con caratteri speciali e unicode" do
    params = {
      prompt: "Scrivi un'email con 中文 e émojis 🚀",
      toneDescription: "Cortese (sempre!)",
      styleDescription: "Stile: minimalista & moderno",
      companyName: "Ñoé Industries",
      companyDescription: "São Paulo, Brasil"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert setter.valid?
    system_prompt = setter.buildSystemPrompt
    assert_includes system_prompt, "Ñoé Industries"
  end

  # === METODO getData ===
  test "getData ritorna tutti i dati della istanza" do
    params = {
      prompt: "Test",
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    setter = TextParamsSetterService.new(params)
    data = setter.getData
    
    assert_equal "Test", data[:prompt]
    assert_equal "Tone", data[:toneDescription]
    assert_equal "Style", data[:styleDescription]
    assert_equal "Company", data[:companyName]
    assert_equal "Desc", data[:companyDescription]
  end

  test "getData include errors array anche se vuoto" do
    params = {
      prompt: "Test",
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    setter = TextParamsSetterService.new(params)
    
    assert_kind_of Array, setter.getData[:errors]
  end

  # === SYSTEM PROMPT STRUCTURE ===
  test "system prompt include regole fondamentali" do
    params = {
      prompt: "Test",
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    setter = TextParamsSetterService.new(params)
    prompt = setter.buildSystemPrompt
    
    assert_includes prompt, "RUOLO:"
    assert_includes prompt, "CONTESTO:"
    assert_includes prompt, "TONO"
    assert_includes prompt, "STILE"
    assert_includes prompt, "REGOLE FONDAMENTALI:"
    assert_includes prompt, "titolo breve"
    assert_includes prompt, "carattere '|'"
    assert_includes prompt, "NON usare MAI placeholder"
  end
end
