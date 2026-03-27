require "test_helper"
require "minitest/mock"

class AiGeneratorComputationServiceTest < ActiveSupport::TestCase
  test "assembla tutte le informazioni formattandole in un Hash" do
    service = AiGeneratorComputationService.new(start_date: 1.day.ago, end_date: 1.day.from_now)

    # STUB: Diciamo a Ruby di intercettare le chiamate al Database
    # e restituire i numeri che decidiamo noi.
    AiGeneratorAnalysesDataManager.any_instance.stubs(:retrieve_prompt_amount_query).returns(100)
    AiGeneratorAnalysesDataManager.any_instance.stubs(:retrieve_average_rate_prompt_query).returns(8.5)
    AiGeneratorAnalysesDataManager.any_instance.stubs(:retrieve_average_regeneration_amount_query).returns(5.0)
    AiGeneratorAnalysesDataManager.any_instance.stubs(:retrieve_tone_usage_query).returns(3.0)
    AiGeneratorAnalysesDataManager.any_instance.stubs(:retrieve_style_usage_query).returns(2.0)


    # ESECUZIONE
    risultato = service.retrieve_all_information

    # VERIFICA
    assert_equal 100, risultato[:prompt_amount]
    assert_equal 8.5, risultato[:average_rate_prompt]
    assert_equal 5.0, risultato[:average_regeneration_amount]
    assert_equal 3.0, risultato[:tone_usage]
    assert_equal 2.0, risultato[:style_usage]

  end
end