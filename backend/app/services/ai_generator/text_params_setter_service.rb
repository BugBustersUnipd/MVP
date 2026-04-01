module AiGenerator
class TextParamsSetterService

  # Inizializza le dipendenze del componente.
  def initialize(paramsData)
    @prompt = paramsData[:prompt]
    @toneDescription = paramsData[:toneDescription]
    @styleDescription = paramsData[:styleDescription]
    @companyName = paramsData[:companyName]
    @companyDescription = paramsData[:companyDescription]
    @errors = []
  end

  # Verifica le condizioni richieste prima di procedere.
  def valid?
    @errors = []
    @errors << "prompt è obbligatorio" if @prompt.blank?
    @errors << "companyName è obbligatorio" if @companyName.blank?
    @errors << "toneDescription è obbligatorio" if @toneDescription.blank?
    @errors << "styleDescription è obbligatorio" if @styleDescription.blank?
    @errors << "companyDescription è obbligatorio" if @companyDescription.blank?
    @errors.empty?
  end

  # Costruisce i dati di output per il flusso corrente.
  def buildSystemPrompt
    <<~PROMPT.strip
      RUOLO: Sei l'IA ufficiale di "#{@companyName}".
      CONTESTO: #{@companyDescription}
      TONO (enfatizzalo): #{@toneDescription}
      STILE (enfatizzalo): #{@styleDescription}
      REGOLE FONDAMENTALI:
      - Rispondi sempre e solo con un titolo breve (testo semplice puro), seguito dal carattere '|' e poi dal contenuto in formato HTML, non specificare se si tratta di titolo o testo, si capisce dal simbolo.
      - Il titolo NON deve contenere prefissi come "Titolo:", "Oggetto:", "Subject:", "Title:" o simili: scrivi direttamente il testo del titolo.
      - Il titolo e il contenuto NON devono contenere marcature markdown come **grassetto** o *corsivo*.
      - Il contenuto deve essere formattato in HTML: usa <p> per i paragrafi, <strong> per il grassetto, <em> per il corsivo, <br> per gli a capo, <ul>/<li> per gli elenchi puntati, <ol>/<li> per gli elenchi numerati.
      - NON includere tag <html>, <head>, <body> o qualsiasi struttura di pagina: solo il contenuto interno (paragrafi, liste, ecc.).
      - Se la domanda non è chiara o non è pertinente a "#{@companyName}", rispondi con 'Domanda non chiara o non pertinente'.
      - Parla come mittente del messaggio senza presentazioni.
      - NON usare MAI placeholder come [nome], [data], ecc.
      - NON usare parentesi quadre [] o graffe {{}}.
      - Il messaggio deve essere SOLO il corpo del testo, niente saluti iniziali ("Certamente", "Ecco la mail") e senza aggiungere frasi prima o dopo.
      - Se mancano info, sii generico ma professionale.
      - Evita completamente qualsiasi elemento che richieda modifica manuale.
    PROMPT
  end

  # Espone i parametri validati e gli eventuali errori raccolti.
  def getData
    {
      prompt: @prompt,
      toneDescription: @toneDescription,
      styleDescription: @styleDescription,
      companyName: @companyName,
      companyDescription: @companyDescription,
      errors: @errors
    }
  end

end
end