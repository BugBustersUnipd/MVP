module AiAnalyst
  module Managers
    class AiCopilotAnalysesDataManager < AnalysesDataManager

      def retrieve_average_confidence_value_query
        # Prendiamo i documenti che hanno il campo confidence compilato
        documents = ExtractedDocument.where(created_at: start_date..end_date)
                                     .where.not(confidence: nil)

        all_confidence_values = []

        documents.each do |doc|
          begin
            # Rails trasforma in automatico il JSONB in Hash.
            # Per sicurezza, se per qualche motivo fosse salvato come stringa, lo parsi.
            data = doc.confidence.is_a?(String) ? JSON.parse(doc.confidence) : doc.confidence

            # Supponendo che il JSON sia tipo { "campo_a": 90.0, "campo_b": 80.0 }
            # Estraiamo solo i valori (90.0 e 80.0) e li convertiamo in Float
            numeric_values = data.values.map(&:to_f)

            # Li "travasiamo" nel nostro array globale
            all_confidence_values.concat(numeric_values)
          rescue
            # Se un JSON è corrotto o vuoto, andiamo avanti al prossimo documento
            next
          end
        end

        return 0.0 if all_confidence_values.empty?

        # Calcoliamo la media su tutti i singoli campi estratti di tutti i documenti
        (all_confidence_values.sum / all_confidence_values.size).round(2)
      end

      def retrieve_human_intervention_value_query
        # Poiché non abbiamo una tabella messaggi, l'intervento umano si misura
        # contando quante volte un operatore ha sovrascritto manualmente l'azienda o il dipartimento
        base_query = UploadedDocument.where(created_at: start_date..end_date)

        base_query.where.not(override_company: nil)
                  .or(base_query.where.not(override_department: nil))
                  .count
      end

      def retrieve_mapping_accuracy_query
        # Percentuale di Documenti Estratti che sono stati abbinati con successo a un Employee
        total_docs = ExtractedDocument.where(created_at: start_date..end_date).count
        return 0 if total_docs.zero?

        mapped_docs = ExtractedDocument.where(created_at: start_date..end_date)
                                       .where.not(matched_employee_id: nil) # Il "mapping" è avvenuto!
                                       .count

        ((mapped_docs.to_f / total_docs) * 100).round(2)
      end

      def retrieve_average_time_analyses_query
        # Media del tempo impiegato in secondi per analizzare ed estrarre i dati
        ExtractedDocument.where(created_at: start_date..end_date)
                         .average(:process_time_seconds)
                         .to_f.round(2)
      end

    end
  end
end
