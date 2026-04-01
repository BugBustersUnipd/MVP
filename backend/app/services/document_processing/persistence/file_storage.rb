module DocumentProcessing
  module Persistence
    class FileStorage
      # Verifica le condizioni richieste prima di procedere.
      def exist?(path)
        File.exist?(path)
      end

      # Rimuove i dati previsti dal flusso corrente.
      def delete(path)
        File.delete(path)
      end

      # Restituisce il percorso assoluto del file.
      def expanded(path)
        File.expand_path(path)
      end
    end
  end
end
