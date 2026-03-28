class ToneSerializer
  # Ritorna company + array di toni (id, name, description)
  def self.serialize_collection(tones)
    {
      tones: tones.map do |tone|
        {
          id: tone.id,
          name: tone.name,
          description: tone.description
        }
      end
    }
  end
end