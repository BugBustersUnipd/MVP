puts "Inizio la pulizia del database..."

Employee.destroy_all
Style.destroy_all
Tone.destroy_all
User.destroy_all
Company.destroy_all

puts "Creazione delle Aziende (Companies)..."
company_a = Company.create!(name: "TechCorp Italia", description: "Azienda italiana specializzata in soluzioni software e servizi tecnologici per le imprese.")
company_b = Company.create!(name: "Innovazione S.p.A.", description: "Società leader nell'innovazione digitale e nella trasformazione tecnologica delle organizzazioni.")

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