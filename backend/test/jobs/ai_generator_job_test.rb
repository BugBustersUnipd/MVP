require "test_helper"

class AiGeneratorJobTest < ActiveSupport::TestCase
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
    assert_equal :default, AiGeneratorJob.new.class.queue_name
  end

  test "job può essere enqueued" do
    assert_enqueued_with(job: AiGeneratorJob) do
      AiGeneratorJob.perform_later(@generation_datum.id)
    end
  end

  # === PERFORM FLOW ===
  test "perform chiama signal_process_start" do
    signal_process_start_called = false
    
    AiJobOrchestrator.stub(:signal_process_start) do |gen_id|
      signal_process_start_called = true if gen_id == @generation_datum.id
    end
    
    # Mock gli altri metodi per evitare errori
    AIGeneratorContainer.any_instance.stubs(:aiGeneratorService)
    AiJobOrchestrator.stub(:complete) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert signal_process_start_called
  end

  test "perform chiama AIGeneratorService.create_content" do
    service_called = false
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |gen_id|
      service_called = true if gen_id == @generation_datum.id
    end
    
    # Mock il container
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    AiJobOrchestrator.stub(:complete) {}
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert service_called
  end

  test "perform chiama complete se service eseguito correttamente" do
    complete_called = false
    complete_gen_id = nil
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) {}
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    
    AiJobOrchestrator.stub(:complete) do |gen_id|
      complete_called = true
      complete_gen_id = gen_id
    end
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert complete_called
    assert_equal @generation_datum.id, complete_gen_id
  end

  # === ERROR HANDLING ===
  test "perform chiama signal_failure se AIGeneratorService solleva errore" do
    failure_called = false
    failure_gen_id = nil
    failure_message = nil
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do
      raise StandardError.new("Errore generazione")
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:complete) {}
    
    AiJobOrchestrator.stub(:signal_failure) do |gen_id, msg|
      failure_called = true
      failure_gen_id = gen_id
      failure_message = msg
    end
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert failure_called
    assert_equal @generation_datum.id, failure_gen_id
    assert_includes failure_message, "Errore generazione"
  end

  test "perform logga errore se service fallisce" do
    error_logged = false
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do
      raise "Errore di timeout"
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    AiJobOrchestrator.stub(:complete) {}
    
    Rails.logger.stub(:error).with(anything) do |msg|
      error_logged = true if msg.include?("ERRORE JOB AI")
    end
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert error_logged
  end

  test "perform gestisce NilClassError in service" do
    failure_called = false
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do
      raise NoMethodError.new("undefined method")
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:complete) {}
    
    AiJobOrchestrator.stub(:signal_failure) { failure_called = true }
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert failure_called
  end

  test "perform gestisce ActiveRecord::RecordNotFoundError" do
    failure_called = false
    error_message = nil
    
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do
      raise ActiveRecord::RecordNotFound.new("Record non trovato")
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:complete) {}
    
    AiJobOrchestrator.stub(:signal_failure) do |gen_id, msg|
      failure_called = true
      error_message = msg
    end
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert failure_called
    assert_includes error_message, "Record non trovato"
  end

  # === IDEMPOTENCE ===
  test "perform può essere rieseguito senza errori" do
    mock_service = Object.new
    call_count = 0
    
    mock_service.define_singleton_method(:create_content) do
      call_count += 1
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:complete) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    
    first_run = AiGeneratorJob.new.perform(@generation_datum.id)
    second_run = AiGeneratorJob.new.perform(@generation_datum.id)
    
    # Non dovrebbe sollevare eccezione
    assert_not_nil first_run
    assert_not_nil second_run
  end

  # === CONTAINER CREATION ===
  test "perform crea nuovo container per il job" do
    containers_created = []
    
    original_new = AIGeneratorContainer.method(:new)
    AIGeneratorContainer.define_singleton_method(:new) do
      container = original_new.call
      containers_created << container
      
      mock_service = Object.new
      mock_service.define_singleton_method(:create_content) {}
      
      container.define_singleton_method(:aiGeneratorService) { mock_service }
      container
    end
    
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:complete) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    
    AiGeneratorJob.new.perform(@generation_datum.id)
    
    assert_not_empty containers_created
  end

  # === PERFORMANCE ===
  test "perform completa con successo" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do
      sleep 0.01 # Simulate some work
    end
    
    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }
    
    AIGeneratorContainer.stubs(:new).returns(mock_container)
    AiJobOrchestrator.stub(:signal_process_start) {}
    AiJobOrchestrator.stub(:complete) {}
    AiJobOrchestrator.stub(:signal_failure) {}
    
    start_time = Time.current
    AiGeneratorJob.new.perform(@generation_datum.id)
    elapsed = Time.current - start_time
    
    # Non dovrebbe prendere troppo tempo (principalmente il sleep 0.01)
    assert elapsed < 1
  end
end
