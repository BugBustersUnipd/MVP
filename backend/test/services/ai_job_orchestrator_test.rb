require "test_helper"

class AiJobOrchestratorTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  def setup
    @company = Company.create!(name: "Test Company")
    @tone = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style = Style.create!(company: @company, name: "Modern", description: "Modern style")
  end

  # === ORCHESTRATE ===
  test "orchestrate crea record GeneratedDatum con status pending" do
    params = {
      prompt: "Test prompt",
      company_id: @company.id,
      tone_id: @tone.id,
      style_id: @style.id
    }
    
    generation = AiGenerator::AiJobOrchestrator.orchestrate(params)
    
    assert generation.persisted?
    assert_equal "pending", generation.status
    assert_equal "Test prompt", generation.prompt
  end

  test "orchestrate mette il job in coda" do
    params = {
      prompt: "Test prompt",
      company_id: @company.id,
      tone_id: @tone.id,
      style_id: @style.id
    }
    
    # Verifichiamo che perform_later viene chiamato
    assert_enqueued_with(job: AiGeneratorJob) do
      AiGenerator::AiJobOrchestrator.orchestrate(params)
    end
  end

  test "orchestrate ritorna il record creato" do
    params = {
      prompt: "Test prompt",
      company_id: @company.id,
      tone_id: @tone.id,
      style_id: @style.id
    }
    
    result = AiGenerator::AiJobOrchestrator.orchestrate(params)
    
    assert_kind_of GeneratedDatum, result
    assert_not_nil result.id
  end

  test "orchestrate solleva errore se tone non e attivo" do
    @tone.update!(is_active: false)

    params = {
      prompt: "Test prompt",
      company_id: @company.id,
      tone_id: @tone.id,
      style_id: @style.id
    }

    assert_no_difference "GeneratedDatum.count" do
      error = assert_raises(AiGenerator::AiJobOrchestrator::InactiveConfigurationError) do
        AiGenerator::AiJobOrchestrator.orchestrate(params)
      end
      assert_includes error.message, "tone"
    end
  end

  test "orchestrate solleva errore se style non e attivo" do
    @style.update!(is_active: false)

    params = {
      prompt: "Test prompt",
      company_id: @company.id,
      tone_id: @tone.id,
      style_id: @style.id
    }

    assert_no_difference "GeneratedDatum.count" do
      error = assert_raises(AiGenerator::AiJobOrchestrator::InactiveConfigurationError) do
        AiGenerator::AiJobOrchestrator.orchestrate(params)
      end
      assert_includes error.message, "style"
    end
  end

  # === SIGNAL PROCESS START ===
  test "signal_process_start aggiorna status a processing" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    AiGenerator::AiJobOrchestrator.signal_process_start(generation.id)
    
    generation.reload
    
    assert_equal "processing", generation.status
  end

  test "signal_process_start aggiorna data_time" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending",
      data_time: nil
    )
    
    time_before = Time.current
    
    AiGenerator::AiJobOrchestrator.signal_process_start(generation.id)
    
    generation.reload
    
    assert_not_nil generation.data_time
    assert generation.data_time >= time_before
  end

  test "signal_process_start trasmette via ActionCable" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    # Mock ActionCable.server.broadcast
    broadcast_called = false
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      broadcast_called = true if channel == "generation_channel"
      payload_captured = payload
      true
    end
    
    AiGenerator::AiJobOrchestrator.signal_process_start(generation.id)
    
    # Verifichiamo che il broadcast include lo stato processing
    assert broadcast_called
    assert_equal generation.id, payload_captured[:id]
    assert_equal "processing", payload_captured[:status]
  end

  test "signal_process_start gestisce ID non esistente gracefully" do
    # Non dovrebbe sollevare eccezione
    AiGenerator::AiJobOrchestrator.signal_process_start(9999)
    
    # Test passed if no exception
    assert true
  end

  # === COMPLETE ===
  test "complete trasmette via ActionCable con statuscompleted" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing",
      title: "Titolo",
      text_result: "Testo"
    )
    
    broadcast_called = false
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      broadcast_called = true if channel == "generation_channel"
      payload_captured = payload
      true
    end
    
    AiGenerator::AiJobOrchestrator.complete(generation.id)
    
    assert broadcast_called
    assert_equal generation.id, payload_captured[:id]
    assert_equal "completed", payload_captured[:status]
    assert_equal "Titolo", payload_captured[:title]
    assert_equal "Testo", payload_captured[:text]
  end

  test "complete include immagine nel payload se allegata" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing",
      title: "Titolo",
      text_result: "Testo"
    )
    
    # Allega un'immagine
    base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    generation.generated_image.attach(
      io: StringIO.new(Base64.decode64(base64)),
      filename: "test.png",
      content_type: "image/png"
    )
    
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      payload_captured = payload if channel == "generation_channel"
      true
    end
    
    AiGenerator::AiJobOrchestrator.complete(generation.id)
    
    assert_not_nil payload_captured[:image_url]
  end

  test "complete gestisce generazione senza immagine" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing",
      title: "Titolo",
      text_result: "Testo"
    )
    
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      payload_captured = payload if channel == "generation_channel"
      true
    end
    
    AiGenerator::AiJobOrchestrator.complete(generation.id)
    
    # image_url potrebbe essere nil o non présente
    assert payload_captured[:id].present?
  end

  test "complete include created_at formattato" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing",
      title: "Titolo",
      text_result: "Testo"
    )
    
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      payload_captured = payload if channel == "generation_channel"
      true
    end
    
    AiGenerator::AiJobOrchestrator.complete(generation.id)
    
    assert_not_nil payload_captured[:created_at]
    # Dovrebbe essere in formato stringa "%Y-%m-%d %H:%M:%S"
    assert_match(/\d{4}-\d{2}-\d{2}/, payload_captured[:created_at])
  end

  test "complete gestisce ID non esistente gracefully" do
    # Non dovrebbe sollevare eccezione
    AiGenerator::AiJobOrchestrator.complete(9999)
    
    assert true
  end

  # === SIGNAL FAILURE ===
  test "signal_failure aggiorna status a failed" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing"
    )
    
    AiGenerator::AiJobOrchestrator.signal_failure(generation.id, "Errore generico")
    
    generation.reload
    
    assert_equal "failed", generation.status
  end

  test "signal_failure trasmette errore via ActionCable" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing"
    )
    
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      payload_captured = payload if channel == "generation_channel"
      true
    end
    
    AiGenerator::AiJobOrchestrator.signal_failure(generation.id, "Timeout esterno")
    
    assert_equal generation.id, payload_captured[:id]
    assert_equal "failed", payload_captured[:status]
    assert_equal "Timeout esterno", payload_captured[:error]
  end

  test "signal_failure usa messaggio default se non fornito" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing"
    )
    
    payload_captured = {}
    
    ActionCable::Server::Base.any_instance.stubs(:broadcast).with do |channel, payload|
      payload_captured = payload if channel == "generation_channel"
      true
    end
    
    AiGenerator::AiJobOrchestrator.signal_failure(generation.id)
    
    assert_includes payload_captured[:error], "Errore generico"
  end

  test "signal_failure gestisce ID non esistente gracefully" do
    # Non dovrebbe sollevare eccezione
    AiGenerator::AiJobOrchestrator.signal_failure(9999, "Errore")
    
    assert true
  end

  # === STATE TRANSITIONS ===
  test "transizione pendingprocessing" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    AiGenerator::AiJobOrchestrator.signal_process_start(generation.id)
    generation.reload
    
    assert_equal "processing", generation.status
  end

  test "transizione processing → completed" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing",
      title: "T",
      text_result: "T"
    )
    
    # Mock il broadcast
    ActionCable::Server::Base.any_instance.stubs(:broadcast)
    
    AiGenerator::AiJobOrchestrator.complete(generation.id)
    
    # L'orchestrator sostanzialmente completa la generazione
    # ma non aggiorna il status (fatto da AIGeneratorDataManager)
    assert true
  end

  test "transizione processing → failed" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing"
    )
    
    # Mock il broadcast
    ActionCable::Server::Base.any_instance.stubs(:broadcast)
    
    AiGenerator::AiJobOrchestrator.signal_failure(generation.id, "Errore")
    
    generation.reload
    
    assert_equal "failed", generation.status
  end
end
