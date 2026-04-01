module AiAnalyst
  module Managers
    class AiCopilotAnalysesDataManager < AnalysesDataManager

      # Calcola la confidenza media aggregando i valori salvati nei documenti estratti.
      def retrieve_average_confidence_value_query
        # Prendiamo i documenti che hanno il campo confidenza compilato
        documents = ExtractedDocument.where(created_at: start_date..end_date)
                                     .where.not(confidence: nil)

        all_confidence_values = []

        documents.each do |doc|
          begin
            # Rails trasforma in automatico il JSONB in Hash.
            # Per sicurezza, se per qualche motivo fosse salvato come stringa, lo parsi.
            data = doc.confidence.is_a?(String) ? JSON.parse(doc.confidence) : doc.confidence

            # Estraiamo i valori numerici e normalizziamo alla scala 0-1.
            # I valori > 1 sono legacy (scala 0-100) e vengono divisi per 100.
            numeric_values = data.values.map(&:to_f).map { |v| v > 1.0 ? v / 100.0 : v }

            all_confidence_values.concat(numeric_values)
          rescue
            # Se un JSON è corrotto o vuoto, andiamo avanti al prossimo documento
            next
          end
        end

        return 0.0 if all_confidence_values.empty?

        # Calcoliamo la media (in scala 0-1) e restituiamo come percentuale 0-100
        ((all_confidence_values.sum / all_confidence_values.size) * 100).round(2)
      end

      # Conta quante volte sono stati applicati override manuali su azienda o reparto.
      def retrieve_human_intervention_value_query
        # Poiché non abbiamo una tabella messaggi, l'intervento umano si misura
        # contando quante volte un operatore ha sovrascritto manualmente l'azienda o il dipartimento
        base_query = UploadedDocument.where(created_at: start_date..end_date)

        base_query.where.not(override_company: nil)
                  .or(base_query.where.not(override_department: nil))
                  .count
      end

      # Calcola la percentuale di documenti mappati a un dipendente.
      def retrieve_mapping_accuracy_query
        # Percentuale di Documenti Estratti che sono stati abbinati con successo a un Employee
        total_docs = ExtractedDocument.where(created_at: start_date..end_date).count
        return 0 if total_docs.zero?

        mapped_docs = ExtractedDocument.where(created_at: start_date..end_date)
                                       .where.not(matched_employee_id: nil) # Il "mapping" è avvenuto!
                                       .count

        ((mapped_docs.to_f / total_docs) * 100).round(2)
      end

      # Calcola il tempo medio di analisi dei documenti estratti.
      def retrieve_average_time_analyses_query
        # Media del tempo impiegato in secondi per analizzare ed estrarre i dati
        ExtractedDocument.where(created_at: start_date..end_date)
                         .average(:process_time_seconds)
                         .to_f.round(2)
      end

    end
  end
end
