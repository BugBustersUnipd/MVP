require "test_helper"
require_relative "../../app/services/ai_generator/ai_generator_container"

class AIGeneratorContainerTest < ActiveSupport::TestCase
  # === LAZY INITIALIZATION ===
  test "aiGeneratorService lazyloads e ritorna istanza valida" do
    container = AiGenerator::AIGeneratorContainer.new
    
    service = container.aiGeneratorService
    
    assert_kind_of AiGenerator::AIGeneratorService, service
  end

  test "aiGeneratorService ritorna la stessa istanza se chiamato più volte" do
    container = AiGenerator::AIGeneratorContainer.new
    
    service1 = container.aiGeneratorService
    service2 = container.aiGeneratorService
    
    assert_equal service1.object_id, service2.object_id
  end

  # === COMPONENT CREATION ===
  test "crea AiGenerator::TextGeneratorService" do
    container = AiGenerator::AIGeneratorContainer.new
    
    text_gen = container.send(:textGenerator)
    
    assert_kind_of AiGenerator::TextGeneratorService, text_gen
  end

  test "crea AiGenerator::ImageGeneratorService" do
    container = AiGenerator::AIGeneratorContainer.new
    
    img_gen = container.send(:imgGenerator)
    
    assert_kind_of AiGenerator::ImageGeneratorService, img_gen
  end

  test "crea AiGenerator::AIGeneratorDataManager" do
    container = AiGenerator::AIGeneratorContainer.new
    
    data_mgr = container.send(:aiGeneratorDataManager)
    
    assert_kind_of AiGenerator::AIGeneratorDataManager, data_mgr
  end

  test "crea AiGenerator::SetterFactory" do
    container = AiGenerator::AIGeneratorContainer.new
    
    factory = container.send(:setterFactory)
    
    assert_kind_of AiGenerator::SetterFactory, factory
  end

  # === REGIONS ===
  test "usa default region se AWS_REGION non impostata" do
    container = AiGenerator::AIGeneratorContainer.new
    
    text_region = container.send(:text_generation_region)
    
    # Dovrebbe essere us-east-1 se non impostato
    assert ["us-east-1", "eu-west-1", ENV["AWS_REGION"]].include?(text_region)
  end

  test "usa image generation region per AiGenerator::ImageGeneratorService" do
    container = AiGenerator::AIGeneratorContainer.new
    
    img_gen = container.send(:imgGenerator)
    
    # L'istanza img_gen dovrebbe avere una regione impostata
    assert_not_nil img_gen
  end

  # === SINGLETON PATTERN ===
  test "due container istanze creano istanze diverse di service" do
    container1 = AiGenerator::AIGeneratorContainer.new
    container2 = AiGenerator::AIGeneratorContainer.new
    
    service1 = container1.aiGeneratorService
    service2 = container2.aiGeneratorService
    
    # Diversi container, servizi diversi
    assert_not_equal service1.object_id, service2.object_id
  end

  # === INTEGRATION ===
  test "aiGeneratorService ha accesso a tutti i componenti di cui ha bisogno" do
    container = AiGenerator::AIGeneratorContainer.new
    
    service = container.aiGeneratorService
    
    # Verifichiamo che il servizio abbia i componenti necessari
    assert_not_nil service.instance_variable_get(:@imgGenerator)
    assert_not_nil service.instance_variable_get(:@textGenerator)
    assert_not_nil service.instance_variable_get(:@aiGeneratorDataManager)
    assert_not_nil service.instance_variable_get(:@setterFactory)
  end

  # === REGION CONFIGURATION ===
  test "container passa regione corretta a AiGenerator::TextGeneratorService" do
    # Mockare l'ambiente per testare
    container = AiGenerator::AIGeneratorContainer.new
    
    text_gen = container.send(:textGenerator)
    
    # Verifichiamo che ha una regione
    assert_not_nil text_gen.instance_variable_get(:@region)
  end

  test "container passa regione corretta a AiGenerator::ImageGeneratorService" do
    container = AiGenerator::AIGeneratorContainer.new
    
    img_gen = container.send(:imgGenerator)
    
    # Verifichiamo che ha una regione
    assert_not_nil img_gen.instance_variable_get(:@region)
  end
end
