module AiGenerator
class TextResponseValidator
  class BlockedResponseError < StandardError; end

  BLOCKED_RESPONSES = [
    "Siamo spiacenti, la domanda non rispetta le linee guida.",
    "Siamo spiacenti, il modello non può rispondere a questa domanda.",
    "Domanda non chiara o non pertinente"
  ].freeze

  # Estrae e prepara i dati utili al processamento.
  def parse!(text_result, generation_id)
    blocked_message = blocked_response_message(text_result)
    raise BlockedResponseError, blocked_message if blocked_message

    split_title_and_content(text_result, generation_id)
  end

  private

  
  def blocked_response_message(text_result)
    return nil if text_result.blank?

    BLOCKED_RESPONSES.find { |msg| text_result.include?(msg) }
  end

  TITLE_PREFIXES = /\A\s*(titolo|oggetto|subject|title)\s*:\s*/i

  
  def split_title_and_content(text_result, generation_id)
    match_data = text_result.match(/^\|\s*(.*?)\s*\|\s*(.*)/m)

    if match_data
      return {
        title: sanitize_title(match_data[1]),
        text: match_data[2].strip
      }
    end

    if text_result.include?('|')
      parts = text_result.split('|').reject(&:blank?)
      if parts.any?
        return {
          title: sanitize_title(parts[0]),
          text: parts[1..-1].join('|').strip
        }
      end
    end

    {
      title: sanitize_title(text_result.lines.first.to_s),
      text: text_result
    }
  end

  # Normalizza il dato per mantenere il formato atteso.
  def sanitize_title(raw)
    raw.strip
       .gsub(TITLE_PREFIXES, '')       # rimuove "Titolo:", "Oggetto:", ecc.
       .gsub(/\*+([^*]+)\*+/, '\1')    # rimuove **grassetto** e *corsivo* markdown
       .gsub(/#+ /, '')                 # rimuove intestazioni markdown (# ## ###)
       .strip
  end
end
end