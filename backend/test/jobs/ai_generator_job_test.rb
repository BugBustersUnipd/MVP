require "test_helper"
require_relative "../../app/services/ai_generator/ai_generator_container"

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

  test "job e enqueued nella coda default" do
    assert_equal "default", AiGeneratorJob.new.class.queue_name
  end

  test "job puo essere enqueued" do
    assert_enqueued_with(job: AiGeneratorJob) do
      AiGeneratorJob.perform_later(@generation_datum.id)
    end
  end

  test "perform chiama AIGeneratorService.create_content" do
    mock_service = Object.new
    mock_service.expects(:create_content).with(@generation_datum.id)

    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }

    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)

    AiGeneratorJob.new.perform(@generation_datum.id)
  end

  test "perform emette eventi generation lifecycle processing e completed" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) { |_gen_id| }

    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }

    events = []
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)

    ActiveSupport::Notifications.subscribed(lambda { |_name, _start, _finish, _id, payload|
      events << payload
    }, "generation.lifecycle") do
      AiGeneratorJob.new.perform(@generation_datum.id)
    end

    assert_equal "processing", events.first[:status]
    assert_equal @generation_datum.id, events.first[:id]

    assert_equal "completed", events.last[:status]
    assert_equal @generation_datum.id, events.last[:id]
  end

  test "perform imposta lo status failed e invia evento failed se il service solleva errore" do
    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      raise StandardError, "Errore generazione"
    end

    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }

    events = []
    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)

    ActiveSupport::Notifications.subscribed(lambda { |_name, _start, _finish, _id, payload|
      events << payload
    }, "generation.lifecycle") do
      AiGeneratorJob.new.perform(@generation_datum.id)
    end

    @generation_datum.reload
    assert_equal "failed", @generation_datum.status
    assert_equal "failed", events.last[:status]
    assert_equal "Errore generazione", events.last[:error]
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

    Rails.logger.stubs(:error).with(anything) do |msg|
      error_logged = true if msg.include?("ERRORE JOB AI")
    end

    AiGeneratorJob.new.perform(@generation_datum.id)

    assert error_logged
  end

  test "perform elimina record quando riceve BlockedResponseError" do
    blocked_message = "Siamo spiacenti, il modello non puo rispondere a questa domanda."

    mock_service = Object.new
    mock_service.define_singleton_method(:create_content) do |_gen_id|
      raise AiGenerator::AIGeneratorService::BlockedResponseError, blocked_message
    end

    mock_container = Object.new
    mock_container.define_singleton_method(:aiGeneratorService) { mock_service }

    AiGenerator::AiGeneratorContainer.stubs(:new).returns(mock_container)

    AiGeneratorJob.new.perform(@generation_datum.id)

    assert_nil GeneratedDatum.find_by(id: @generation_datum.id)
  end

  test "perform con id inesistente non solleva errori" do
    assert_nothing_raised do
      AiGeneratorJob.new.perform(-1)
    end
  end
end
