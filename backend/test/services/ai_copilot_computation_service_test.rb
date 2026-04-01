require "test_helper"

class AiCopilotComputationServiceTest < ActiveSupport::TestCase
  test "assembla tutte le informazioni del copilot formattandole in un Hash" do
    # 1. Inizializziamo il servizio
    service = AiAnalyst::AiCopilotComputationService.new(start_date: 1.day.ago, end_date: 1.day.from_now)

    # 2. STUB: Blocchiamo le vere query al DB e restituiamo numeri preimpostati
    AiAnalyst::Managers::AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_average_confidence_value_query).returns(95.5)
    AiAnalyst::Managers::AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_human_intervention_value_query).returns(12)
    AiAnalyst::Managers::AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_mapping_accuracy_query).returns(88.0)
    AiAnalyst::Managers::AiCopilotAnalysesDataManager.any_instance.stubs(:retrieve_average_time_analyses_query).returns(3.5)

    # 3. ESECUZIONE: Chiamiamo il metodo principale del servizio
    risultato = service.retrieve_all_information

    # 4. VERIFICA: Controlliamo che l'Hash finale contenga i dati attesi
    # Usiamo le chiavi esatte che il servizio sta costruendo e che il Controller invia al frontend
    assert_equal 95.5, risultato[:average_confidence]
    assert_equal 12, risultato[:average_human_intervention]
    assert_equal 88.0, risultato[:mapping_accuracy]
    assert_equal 3.5, risultato[:average_time_analyses]
  end
end
