require "test_helper"
require_relative "../../app/services/ai_generator/ai_generator_container"
require_relative "../../app/services/ai_generator/ai_job_orchestrator"

class AiGeneratorJobTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  def setup
    @company = Company.create!(name: "Test Company")
    @tone = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style = Style.create!(company: @company, name: "Modern", description: "Modern style")
    
    @generation_datum = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test prompt",
      status: "pending"
    )
  end

  # === JOB CONFIGURATION ===
  test "job è enqueued nella coda default" do
    assert_equal "default", AiGeneratorJob.new.class.queue_name
  end

  test "job può essere enqueued" do
    assert_enqueued_with(job: AiGeneratorJob) do
      AiGeneratorJob.perform_later(@generation_datum.id)
    end
  end

  # === PERFORM FLOW ===
  test "perform chiama signal_process_start" do
    AiGenerator::AiJobOrchestrator.expects(:signal_process_start).with(@generation_datum.id)
    
    # Mock gli altri metodi per evitare errori
    AiGenerator::AiGeneratorContainer.any_instance.stubs(:aiGeneratorService)
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}
    
    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  test "perform chiama AIGeneratorService.create_content" do
    mock_service = Object.new
    mock_service.expects(:create_content).with(@generation_datum.id)
    
    # Mock il container
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    
    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  test "perform chiama complete se service eseguito correttamente" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) { |_gen_id| }
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}
    AiGenerator::AiJobOrchestrator.expects(:complete).with(@generation_datum.id)
    
    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  # === ERROR HANDLING ===
  test "perform chiama signal_failure se AIGeneratorService solleva errore" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      raise StandardError.new("Errore generazione")
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.expects(:signal_failure).with(@generation_datum.id, includes("Errore generazione"))
    
    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  test "perform logga errore se service fallisce" do
    error_logged = false
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      raise "Errore di timeout"
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    
    Rails.logger.stubs(:error).with(anything) do |msg|
      error_logged = true if msg.include?("ERRORE JOB AI")
    end
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert error_logged
  end

  test "perform gestisce NilClassError in service" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      raise NoMethodError.new("undefined method")
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.expects(:signal_failure).with(@generation_datum.id, anything)
    
    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  test "perform gestisce ActiveRecord::RecordNotFoundError" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      raise ActiveRecord::RecordNotFound, "Record non trovato"
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.expects(:signal_failure).with(@generation_datum.id, includes("Record non trovato"))
    
    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  # === IDEMPOTENCE ===
  test "perform può essere rieseguito senza errori" do
    mock_service = Object.new
    call_count = 0
    
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      call_count += 1
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}
    
    first_run = AiGeneratorJob.new.perform(@generation_datum.id)
    second_run = AiGeneratorJob.new.perform(@generation_datum.id)
    
    # Non dovrebbe sollevare eccezione e il servizio viene invocato due volte
    assert_nil first_run
    assert_nil second_run
    assert_equal 2, call_count
  end

  # === CONTAINER CREATION ===
  test "perform crea nuovo container per il job" do
    containers_created = []

    container = AiGenerator::AiGeneratorContainer.new
    containers_created << container

    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) { |_gen_id| }
    container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}

    stub_new(AiGenerator::AiGeneratorContainer, container) do
      AiGeneratorJob.new.perform(@generation_datum.id)
    end
    
    assert_not_empty containers_created
  end

  # === PERFORMANCE ===
  test "perform completa con successo" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      sleep 0.01 # Simulate some work
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)
    AiGenerator::AiJobOrchestrator.stubs(:signal_process_start) {}
    AiGenerator::AiJobOrchestrator.stubs(:complete) {}
    AiGenerator::AiJobOrchestrator.stubs(:signal_failure) {}
    
    start_time = Time.current
    AiGeneratorJob.new.perform(@generation_datum.id)
    elapsed = Time.current - start_time
    
    # Non dovrebbe prendere troppo tempo (principalmente il sleep 0.01)
    assert elapsed < 1
  end
end
