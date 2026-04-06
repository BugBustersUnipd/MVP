require "test_helper"

class AiJobOrchestratorTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  def setup
    @company = Company.create!(name: "Test Company")
    @tone = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style = Style.create!(company: @company, name: "Modern", description: "Modern style")
  end

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

    assert_enqueued_jobs 1, only: AiGeneratorJob do
      AiGenerator::AiJobOrchestrator.orchestrate(params)
    end

    enqueued = enqueued_jobs.last
    assert_equal AiGeneratorJob, enqueued[:job]
    assert_kind_of Integer, enqueued[:args].first
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

  test "orchestrate solleva errore se tone e style non attivi" do
    @tone.update!(is_active: false)
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
      assert_includes error.message, "tone"
      assert_includes error.message, "style"
    end
  end
end
