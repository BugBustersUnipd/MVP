require "test_helper"

class SetterFactoryTest < ActiveSupport::TestCase
  # === FACTORY METHODS ===
  test "create_text_setter ritorna istanza di TextParamsSetterService" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Test",
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    result = factory.create_text_setter(params)
    
    assert_kind_of TextParamsSetterService, result
  end

  test "create_image_setter ritorna istanza di ImageParamsSetterService" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024,
      seed: 42
    }
    
    result = factory.create_image_setter(params)
    
    assert_kind_of ImageParamsSetterService, result
  end

  # === TEXT SETTER CREATION ===
  test "create_text_setter passa i parametri correttamente" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Scrivi email",
      toneDescription: "Formale",
      styleDescription: "Moderno",
      companyName: "Acme",
      companyDescription: "Tech company"
    }
    
    setter = factory.create_text_setter(params)
    data = setter.getData
    
    assert_equal "Scrivi email", data[:prompt]
    assert_equal "Formale", data[:toneDescription]
    assert_equal "Moderno", data[:styleDescription]
    assert_equal "Acme", data[:companyName]
    assert_equal "Tech company", data[:companyDescription]
  end

  test "text setter creato è valido se parametri completi" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Test",
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    setter = factory.create_text_setter(params)
    
    assert setter.valid?
  end

  test "text setter creato è invalido se prompt manca" do
    factory = SetterFactory.new
    
    params = {
      prompt: nil,
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    setter = factory.create_text_setter(params)
    
    assert_not setter.valid?
  end

  # === IMAGE SETTER CREATION ===
  test "create_image_setter passa i parametri correttamente" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Un paesaggio",
      width: 1280,
      height: 720,
      seed: 123
    }
    
    setter = factory.create_image_setter(params)
    data = setter.getData
    
    assert_equal 1280, data[:width]
    assert_equal 720, data[:height]
    assert_equal 123, data[:seed]
  end

  test "image setter creato è valido con dimensioni supportate" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Test image",
      width: 1024,
      height: 1024,
      seed: 42
    }
    
    setter = factory.create_image_setter(params)
    
    assert setter.valid?
  end

  test "image setter creato è invalido se prompt manca" do
    factory = SetterFactory.new
    
    params = {
      prompt: "",
      width: 1024,
      height: 1024
    }
    
    setter = factory.create_image_setter(params)
    
    assert_not setter.valid?
  end

  test "image setter usa defaults se width/height non forniti" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Test"
    }
    
    setter = factory.create_image_setter(params)
    data = setter.getData
    
    assert_equal 1024, data[:width]
    assert_equal 1024, data[:height]
  end

  # === FACTORY REUSABILITY ===
  test "factory può creare più setters text" do
    factory = SetterFactory.new
    
    params1 = {
      prompt: "Email 1",
      toneDescription: "Formale",
      styleDescription: "Style1",
      companyName: "Company1",
      companyDescription: "Desc1"
    }
    
    params2 = {
      prompt: "Email 2",
      toneDescription: "Informale",
      styleDescription: "Style2",
      companyName: "Company2",
      companyDescription: "Desc2"
    }
    
    setter1 = factory.create_text_setter(params1)
    setter2 = factory.create_text_setter(params2)
    
    assert_not_equal setter1.object_id, setter2.object_id
    assert_equal "Email 1", setter1.getData[:prompt]
    assert_equal "Email 2", setter2.getData[:prompt]
  end

  test "factory può creare più setters image" do
    factory = SetterFactory.new
    
    params1 = {
      prompt: "Paesaggio",
      width: 1024,
      height: 1024,
      seed: 1
    }
    
    params2 = {
      prompt: "Ritratto",
      width: 1280,
      height: 720,
      seed: 2
    }
    
    setter1 = factory.create_image_setter(params1)
    setter2 = factory.create_image_setter(params2)
    
    assert_not_equal setter1.object_id, setter2.object_id
    assert_equal 1024, setter1.getData[:width]
    assert_equal 1280, setter2.getData[:width]
  end

  test "factory può alternare creazione text e image setters" do
    factory = SetterFactory.new
    
    text_params = {
      prompt: "Test",
      toneDescription: "Tone",
      styleDescription: "Style",
      companyName: "Company",
      companyDescription: "Desc"
    }
    
    image_params = {
      prompt: "Image",
      width: 1024,
      height: 1024
    }
    
    text_setter = factory.create_text_setter(text_params)
    image_setter = factory.create_image_setter(image_params)
    text_setter2 = factory.create_text_setter(text_params)
    
    assert_kind_of TextParamsSetterService, text_setter
    assert_kind_of ImageParamsSetterService, image_setter
    assert_kind_of TextParamsSetterService, text_setter2
  end

  # === EDGE CASES ===
  test "crea text setter con parametri unicode" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Scrivi un'email 中文",
      toneDescription: "Tono: émojis 🎨",
      styleDescription: "Ñoé style",
      companyName: "São Paulo Corp",
      companyDescription: "Ñoé Industries 中文"
    }
    
    setter = factory.create_text_setter(params)
    
    assert setter.valid?
  end

  test "crea image setter con prompt unicode" do
    factory = SetterFactory.new
    
    params = {
      prompt: "Paesaggio 中文 con émojis 🌅",
      width: 1024,
      height: 1024
    }
    
    setter = factory.create_image_setter(params)
    
    assert setter.valid?
  end

  # === SINGLETON-LIKE USAGE ===
  test "due istanze di factory creano istanze differenti di setter" do
    factory1 = SetterFactory.new
    factory2 = SetterFactory.new
    
    params = {
      prompt: "Test",
      width: 1024,
      height: 1024
    }
    
    setter1 = factory1.create_image_setter(params)
    setter2 = factory2.create_image_setter(params)
    
    # Istanze diverse, ma con stessi dati
    assert_not_equal setter1.object_id, setter2.object_id
    assert_equal setter1.getData[:width], setter2.getData[:width]
  end
end
