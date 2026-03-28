require "test_helper"

class GeneratedDatumTest < ActiveSupport::TestCase
  def setup
    @company = Company.create!(name: "Test Company")
    @tone = Tone.create!(company: @company, name: "Professional", description: "Be professional")
    @style = Style.create!(company: @company, name: "Modern", description: "Modern style")
  end

  # === ASSOCIATIONS ===
  test "has_one_attached :generated_image" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    # L'association esiste
    assert generation.respond_to?(:generated_image)
  end

  test "belongs_to :tone" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_equal @tone.id, generation.tone_id
    assert_equal @tone, generation.tone
  end

  test "belongs_to :style" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_equal @style.id, generation.style_id
    assert_equal @style, generation.style
  end

  test "belongs_to :company" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_equal @company.id, generation.company_id
    assert_equal @company, generation.company
  end

  test "belongs_to :version (optional self-reference)" do
    generation1 = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test v1",
      status: "completed"
    )
    
    generation2 = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test v2",
      status: "pending",
      version_id: generation1.id
    )
    
    assert_equal generation1.id, generation2.version_id
    assert_equal generation1, generation2.version
  end

  # === ATTRIBUTES ===
  test "crea record con attributi essenziali" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Scrivi un'email",
      status: "pending"
    )
    
    assert_equal "Scrivi un'email", generation.prompt
    assert_equal "pending", generation.status
  end

  test "salva titolo e testo generati" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending",
      title: "Titolo Email",
      text_result: "Corpo email"
    )
    
    assert_equal "Titolo Email", generation.title
    assert_equal "Corpo email", generation.text_result
  end

  test "salva dimensioni immagine (width, height, seed)" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending",
      width: 1280,
      height: 720,
      seed: 42
    )
    
    assert_equal 1280, generation.width
    assert_equal 720, generation.height
    assert_equal 42, generation.seed
  end

  test "salva tempi (generation_time, data_time)" do
    now = Time.current
    
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending",
      generation_time: 2.5,
      data_time: now
    )
    
    assert_equal 2.5, generation.generation_time
    assert_equal now.to_i, generation.data_time.to_i
  end

  # === STATUS STATES ===
  test "può avere status pending" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_equal "pending", generation.status
  end

  test "può avere status processing" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "processing"
    )
    
    assert_equal "processing", generation.status
  end

  test "può avere status completed" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "completed"
    )
    
    assert_equal "completed", generation.status
  end

  test "può avere status failed" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "failed"
    )
    
    assert_equal "failed", generation.status
  end

  test "può transitare tra stati" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_equal "pending", generation.status
    
    generation.update(status: "processing")
    assert_equal "processing", generation.status
    
    generation.update(status: "completed")
    assert_equal "completed", generation.status
  end

  # === IMAGE ATTACHMENT ===
  test "allega immagine tramite Active Storage" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    base64_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    image_data = Base64.decode64(base64_data)
    
    generation.generated_image.attach(
      io: StringIO.new(image_data),
      filename: "test.png",
      content_type: "image/png"
    )
    
    assert generation.generated_image.attached?
  end

  test "stacca immagine" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    base64_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    image_data = Base64.decode64(base64_data)
    
    generation.generated_image.attach(
      io: StringIO.new(image_data),
      filename: "test.png",
      content_type: "image/png"
    )
    
    assert generation.generated_image.attached?
    
    generation.generated_image.purge
    
    generation.reload
    assert_not generation.generated_image.attached?
  end

  # === EAGER LOADING ===
  test "eager load tone" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    # Preload per evitare N+1
    loaded = GeneratedDatum.includes(:tone).find(generation.id)
    
    assert_equal @tone.description, loaded.tone.description
  end

  test "eager load company e tone insieme" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    loaded = GeneratedDatum.includes(:company, :tone, :style).find(generation.id)
    
    assert_equal @company.name, loaded.company.name
    assert_equal @tone.description, loaded.tone.description
    assert_equal @style.description, loaded.style.description
  end

  # === VALIDATIONS (if exist) ===
  test "richiede company" do
    generation = GeneratedDatum.new(
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_not generation.valid?
  end

  test "richiede tone" do
    generation = GeneratedDatum.new(
      company: @company,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_not generation.valid?
  end

  test "richiede style" do
    generation = GeneratedDatum.new(
      company: @company,
      tone: @tone,
      prompt: "Test",
      status: "pending"
    )
    
    assert_not generation.valid?
  end

  # === VERSION HISTORY ===
  test "supporta version history tramite self-reference" do
    generation_v1 = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Version 1",
      status: "completed",
      title: "V1"
    )
    
    generation_v2 = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Version 2",
      status: "completed",
      title: "V2",
      version_id: generation_v1.id
    )
    
    assert generation_v2.version.present?
    assert_equal generation_v1.id, generation_v2.version.id
  end

  test "version_id è opzionale" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "pending"
    )
    
    assert_nil generation.version_id
  end

  # === EDGE CASES ===
  test "crea record con tutti i campi pieni" do
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Scrivi un'email con 中文 support",
      status: "completed",
      title: "Titolo 中文",
      text_result: "Corpo email con unicode и characters 🎨",
      width: 1280,
      height: 720,
      seed: 999,
      generation_time: 3.5,
      data_time: Time.current
    )
    
    assert_equal "completed", generation.status
    assert_includes generation.text_result, "🎨"
  end

  test "prompt può essere molto lungo" do
    long_prompt = "a" * 10000
    
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: long_prompt,
      status: "pending"
    )
    
    assert_equal long_prompt, generation.prompt
  end

  test "testo risultato può essere molto lungo" do
    long_text = "Lorem ipsum dolor sit amet " * 1000
    
    generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Test",
      status: "completed",
      text_result: long_text
    )
    
    assert_equal long_text, generation.text_result
  end
end
