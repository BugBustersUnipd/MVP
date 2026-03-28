require "test_helper"

class AiCopilotComputationServiceTest < ActiveSupport::TestCase
  test "assembla tutte le informazioni del copilot formattandole in un Hash" do
    # 1. Inizializziamo il Service
    service = AiCopilotComputationService.new(start_date: 1.day.ago, end_date: 1.day.from_now)

    # 2. STUB: Blocchiamo le vere query al DB e restituiamo numeri preimpostati
    AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_average_confidence_value_query).returns(95.5)
    AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_human_intervention_value_query).returns(12)
    AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_mapping_accuracy_query).returns(88.0)
    AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_average_time_analyses_query).returns(3.5)

    # 3. ESECUZIONE: Chiamiamo il metodo principale del service
    risultato = service.retrieve_all_information

    # 4. VERIFICA: Controlliamo che l'Hash finale contenga i dati attesi
    # I nomi delle chiavi riflettono la traduzione in snake_case dell'UML
    assert_equal 95.5, risultato[:average_confidence_value]
    assert_equal 12, risultato[:human_intervention_value]
    assert_equal 88.0, risultato[:mapping_accuracy]
    assert_equal 3.5, risultato[:average_time_analyses]
  end
end