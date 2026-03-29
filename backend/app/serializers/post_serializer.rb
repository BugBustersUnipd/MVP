class PostSerializer
  def self.serialize_collection(posts)
    {
      posts: posts.map do |post|
        generation = post.generated_datum
        {
          id: post.id,
          title: post.title,
          PostText: post.body_text,
          imgPath: post.img_path,
          dateTime: post.date_time&.iso8601,
          generatedDatumId: post&.generated_datum_id,
          toneId: generation&.tone_id,
          toneName: generation&.tone&.name,
          styleId: generation&.style_id,
          styleName: generation&.style&.name,
          prompt: generation&.prompt,
          companyId: generation&.company_id,
          companyName: generation&.company&.name,
          rating: generation&.rating
        }
      end
    }
  end
end