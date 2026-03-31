puts "Inizio la pulizia del database..."

Employee.destroy_all
Style.destroy_all
Tone.destroy_all
User.destroy_all
Company.destroy_all

puts "Creazione delle Aziende (Companies)..."
company_a = Company.create!(name: "TechCorp Italia", description: "Azienda italiana specializzata in soluzioni software e servizi tecnologici per le imprese.")
company_b = Company.create!(name: "Innovazione S.p.A.", description: "Società leader nell'innovazione digitale e nella trasformazione tecnologica delle organizzazioni.")

puts "Aggiungo MILES BEYOND S.R.L. e Claudio Pastore..."

company_c = Company.create!(
  name: "MILES BEYOND S.R.L.",
  description: "Azienda specializzata in servizi logistici avanzati e soluzioni B2B."
)

user_claudio = User.create!(
  cf: "PSTRCL80A01H501X",
  username: "claudio.pastore",
  password: "Passw0rd!2026",
  email: "claudio.pastore@milesbeyond.it",
  name: "Claudio",
  surname: "Pastore"
)

Employee.create!(
  department: "Amministrazione",
  user: user_claudio,
  company: company_c
)

puts "MILES BEYOND S.R.L. e Claudio Pastore creati."

puts "Creazione degli Utenti (Users)..."
user1 = User.create!(
  cf: "RSSMRA80A01H501U", username: "mario.rossi", password: "password123", 
  email: "mario.rossi@example.com", name: "Mario", surname: "Rossi"
)
user2 = User.create!(
  cf: "BNCGNN90B41F205Z", username: "giovanna.bianchi", password: "password123", 
  email: "giovanna.bianchi@example.com", name: "Giovanna", surname: "Bianchi"
)

puts "Creazione dei Toni (Tones)..."
Tone.create!(name: "Formale", description: "Tono professionale e distaccato", company: company_a)
Tone.create!(name: "Amichevole", description: "Tono caldo ed empatico", company: company_a)
Tone.create!(name: "Persuasivo", description: "Tono commerciale per vendite", company: company_b)

puts "Creazione degli Stili (Styles)..."
Style.create!(name: "Sintetico", description: "Frasi brevi e dritte al punto", company: company_a)
Style.create!(name: "Dettagliato", description: "Molto descrittivo e prolisso", company: company_b)

puts "Creazione dei Dipendenti (Employees)..."
# Colleghiamo gli utenti alle aziende
Employee.create!(department: "IT", user: user1, company: company_a)
Employee.create!(department: "Risorse Umane", user: user2, company: company_b)

puts "✅ Seeding completato con successo!"