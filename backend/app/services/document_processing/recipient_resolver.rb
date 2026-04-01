module DocumentProcessing
  class RecipientResolver
    DEFAULT_THRESHOLD = 0.72

    # Inizializza le dipendenze del componente.
    def initialize(threshold: DEFAULT_THRESHOLD)
      @threshold = threshold
    end

    # Risolve il destinatario migliore partendo dai nomi estratti o dal testo grezzo.
    def resolve(recipient_names:, raw_text: nil)
      names = Array(recipient_names).reject(&:blank?)
      fallback_text = names.first.presence || raw_text

      search_terms = names.map { |name| normalize(name) }.reject(&:blank?)
      search_terms = [normalize(raw_text)] if search_terms.empty? && raw_text.present?
      return empty_result if search_terms.empty?

      best_match = search_terms
        .flat_map { |term| best_matches_for_term(term) }
        .max_by { |candidate| candidate[:score] }

      if best_match && best_match[:score] >= @threshold
        matched_result(best_match)
      else
        unmatched_result(fallback_text: fallback_text, best_match: best_match)
      end
    end

    private

    # Calcola i candidati con punteggio per un termine normalizzato.
    def best_matches_for_term(normalized_term)
      candidate_employees(normalized_term)
        .map { |employee| score_candidate(employee, normalized_term) }
        .compact
    end

    # Costruisce il risultato quando il destinatario viene trovato.
    def matched_result(best_match)
      DocumentProcessing::RecipientResolutionResult.new(
        status: :matched,
        employee: best_match[:employee],
        score: best_match[:score],
        matched_term: best_match[:term]
      )
    end

    # Costruisce il risultato quando non c'e' un match sopra soglia.
    def unmatched_result(fallback_text:, best_match:)
      DocumentProcessing::RecipientResolutionResult.new(
        status: :unmatched,
        fallback_text: fallback_text,
        score: best_match&.dig(:score),
        matched_term: best_match&.dig(:term)
      )
    end

    # Restituisce un risultato vuoto quando mancano termini utili.
    def empty_result
      DocumentProcessing::RecipientResolutionResult.new(status: :empty)
    end

    # Recupera utenti candidati collegati a un record Employee.
    def candidate_employees(normalized_term)
      tokens = normalized_term.split.uniq.select { |token| token.length >= 3 }.first(8)

      # Restituisce User per mantenere compatibilita' con il codice chiamante.
      scope = User.joins("INNER JOIN employees ON employees.user_id = users.id").select('users.*').where.not(email: [nil, ""])

      if tokens.any?
        where_clause = tokens.map { "LOWER(users.name) LIKE ?" }.join(" OR ")
        like_values = tokens.map { |token| "%#{token}%" }
        scoped = scope.where(where_clause, *like_values).limit(300).to_a
        return scoped if scoped.any?
      end

      scope.limit(500).to_a
    end

    # Assegna un punteggio al candidato combinando match esatto e fuzzy match.
    def score_candidate(employee, normalized_term)
      normalized_name = normalize(employee.name)
      return nil if normalized_name.blank?

      name_tokens = normalized_name.split.uniq
      term_tokens = normalized_term.split.uniq

      exact_score = if term_tokens.size <= 6
        if normalized_name == normalized_term
          1.0
        elsif (term_tokens - name_tokens).empty? || (name_tokens - term_tokens).empty?
          0.95
        else
          0.0
        end
      else
        0.0
      end

      jw_score = fuzzy_token_score(term_tokens, name_tokens)
      char_score = dice_coefficient(normalized_name, normalized_term)

      length_penalty = if term_tokens.size > 8
        [1.0 - ((term_tokens.size - 8) * 0.05), 0.5].max
      else
        1.0
      end

      combined = (jw_score * 0.60 + char_score * 0.40) * length_penalty
      final_score = [exact_score, combined].max

      { employee: employee, score: final_score, term: normalized_term }
    end

    # Normalizza il dato per mantenere il formato atteso.
    def normalize(value)
      value.to_s
        .unicode_normalize(:nfd)
        .gsub(/\p{Mn}/, "")
        .downcase
        .gsub(/[^a-z0-9\s]/, " ")
        .gsub(/\s+/, " ")
        .strip
    end

    # Calcola uno score medio fuzzy tra i token del termine e del nome.
    def fuzzy_token_score(term_tokens, name_tokens)
      return 0.0 if term_tokens.empty? || name_tokens.empty?

      total = term_tokens.sum { |t| name_tokens.map { |n| jaro_winkler(t, n) }.max }
      total / term_tokens.size
    end

    # Calcola la similarita' Jaro-Winkler tra due stringhe.
    def jaro_winkler(s1, s2)
      return 1.0 if s1 == s2
      return 0.0 if s1.empty? || s2.empty?

      len1, len2 = s1.length, s2.length
      match_dist = [[len1, len2].max / 2 - 1, 0].max

      s1_matched = Array.new(len1, false)
      s2_matched = Array.new(len2, false)
      matches = 0

      (0...len1).each do |i|
        ([0, i - match_dist].max..[len2 - 1, i + match_dist].min).each do |j|
          next if s2_matched[j] || s1[i] != s2[j]
          s1_matched[i] = true
          s2_matched[j] = true
          matches += 1
          break
        end
      end

      return 0.0 if matches.zero?

      transpositions = 0
      k = 0
      (0...len1).each do |i|
        next unless s1_matched[i]

        k += 1 until s2_matched[k]
        transpositions += 1 if s1[i] != s2[k]
        k += 1
      end

      jaro = (
        matches.to_f / len1 +
        matches.to_f / len2 +
        (matches - transpositions / 2.0) / matches
      ) / 3.0

      prefix = 0
      [4, len1, len2].min.times { |i| s1[i] == s2[i] ? prefix += 1 : break }

      jaro + prefix * 0.1 * (1.0 - jaro)
    end

    # Calcola la similarita' Dice sui bigrammi.
    def dice_coefficient(a, b)
      left = bigrams(a)
      right = bigrams(b)
      return 0.0 if left.empty? || right.empty?

      left_count = left.tally
      right_count = right.tally
      overlap = left_count.sum { |gram, count| [count, right_count[gram].to_i].min }

      (2.0 * overlap) / (left.size + right.size)
    end

    # Genera i bigrammi di una stringa.
    def bigrams(text)
      return [] if text.length < 2

      text.chars.each_cons(2).map(&:join)
    end
  end
end
