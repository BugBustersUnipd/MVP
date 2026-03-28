class AiGeneratorAnalysesDataManager < AnalysesDataManager
  
  def retrieve_prompt_amount_query
    # Conta il numero di prompt utilizzati (escludendo eventuali record con prompt vuoto o nullo)
    GeneratedDatum.where(created_at: start_date..end_date)
                  .where.not(prompt: [nil, ""])
                  .count
  end

  def retrieve_average_rate_prompt_query
    # Media della valutazione (rating) assegnata ai contenuti generati
    GeneratedDatum.where(created_at: start_date..end_date)
                  .average(:rating)
                  .to_f.round(2)
  end

  def retrieve_average_regeneration_amount_query
    # Calcola in media quante versioni (rigenerazioni) vengono fatte per un contenuto originale
    base_query = GeneratedDatum.where(created_at: start_date..end_date)
    
    # I contenuti originali sono quelli senza version_id (la nostra chiave auto-referenziale)
    originals_count = base_query.where(version_id: nil).count
    return 0 if originals_count.zero?
    
    # Le rigenerazioni (versioni successive) sono quelle che HANNO un version_id
    versions_count = base_query.where.not(version_id: nil).count
    
    (versions_count.to_f / originals_count).round(2)
  end

  def retrieve_tone_usage_query
    # Restituisce un hash formattato così: { "Professionale" => 15, "Amichevole" => 4 }
    GeneratedDatum.where(created_at: start_date..end_date)
                  .joins(:tone)
                  .group('tones.name')
                  .count
  end

  def retrieve_style_usage_query
    # Restituisce un hash formattato così: { "Conciso" => 10, "Dettagliato" => 9 }
    GeneratedDatum.where(created_at: start_date..end_date)
                  .joins(:style)
                  .group('styles.name')
                  .count
  end
  
end