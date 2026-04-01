class StyleSerializer
  # Serializza il payload nel formato atteso dal client.
  def self.serialize_collection(styles)
    {
      styles: styles.map do |style|
        {
          id: style.id,
          name: style.name,
          description: style.description
        }
      end
    }
  end
end
