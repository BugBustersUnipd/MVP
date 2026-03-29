class PostSerializer
  def self.serialize_collection(posts)
    {
      posts: posts.map do |post|
        generation = post.generated_datum
        toneName = generation&.tone_id&.name
        styleName = generation&.style_id&.name
        companyName = generation&.company_id&.name
        rating = generation&.rating
        {
          id: post.id,
          title: post.title,
          PostText: post.body_text,
          imgPath: post.img_path,
          dateTime: post.date_time&.iso8601,
          generatedDatumId: post&.generated_datum_id,
          toneId: generation&.tone_id,
          toneName: toneName,
          styleId: generation&.style_id,
          styleName: styleName,
          prompt: generation&.prompt,
          companyId: generation&.company_id,
          companyName: companyName,
          rating: rating
        }
      end
    }
  end
end