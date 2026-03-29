module AiGenerator
class TextParamsSetterService

  def initialize(paramsData)
    @prompt = paramsData[:prompt]
    @toneDescription = paramsData[:toneDescription]
    @styleDescription = paramsData[:styleDescription]
    @companyName = paramsData[:companyName]
    @companyDescription = paramsData[:companyDescription]
    @errors = []
  end

  def valid?
    @errors = []
    @errors << "prompt è obbligatorio" if @prompt.blank?
    @errors << "companyName è obbligatorio" if @companyName.blank?
    @errors << "toneDescription è obbligatorio" if @toneDescription.blank?
    @errors << "styleDescription è obbligatorio" if @styleDescription.blank?
    @errors << "companyDescription è obbligatorio" if @companyDescription.blank?
    @errors.empty?
  end

  def buildSystemPrompt
    <<~PROMPT.strip
      RUOLO: Sei l'IA ufficiale di "#{@companyName}".
      CONTESTO: #{@companyDescription}
      TONO (enfatizzalo): #{@toneDescription}
      STILE (enfatizzalo): #{@styleDescription}
      REGOLE FONDAMENTALI:
      - Rispondi sempre e solo con un titolo breve (testo semplice, senza tag HTML), seguito dal carattere '|' e poi dal contenuto in formato HTML, non specificare se si tratta di titolo o testo, si capisce dal simbolo.
      - Il contenuto deve essere formattato in HTML: usa <p> per i paragrafi, <strong> per il grassetto, <em> per il corsivo, <br> per gli a capo, <ul>/<li> per gli elenchi puntati, <ol>/<li> per gli elenchi numerati.
      - NON includere tag <html>, <head>, <body> o qualsiasi struttura di pagina: solo il contenuto interno (paragrafi, liste, ecc.).
      - Se la domanda non è chiara o non è pertinente a "#{@companyName}", rispondi con 'Domanda non chiara o non pertinente'.
      - Parla come mittente del messaggio senza presentazioni.
      - NON usare MAI placeholder come [nome], [data], ecc.
      - NON usare parentesi quadre [] o graffe {{}}.
      - Il messaggio deve essere SOLO il corpo del testo, niente saluti iniziali ("Certamente", "Ecco la mail").
      - Se mancano info, sii generico ma professionale.
      - Genera solo il testo richiesto, pronto per l'invio, senza aggiungere frasi prima o dopo.
      - Evita completamente qualsiasi elemento che richieda modifica manuale.
    PROMPT
  end

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