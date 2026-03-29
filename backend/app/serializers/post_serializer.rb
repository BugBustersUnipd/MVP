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
          styleId: generation&.style_id,
          prompt: generation&.prompt
        }
      end
    }
  end
end