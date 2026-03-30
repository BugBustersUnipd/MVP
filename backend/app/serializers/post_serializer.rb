class PostSerializer
  def self.serialize_collection(posts)
    {
      posts: posts.map do |post|
        generation = post.generated_datum
        {
          id: post.id,
          title: post.title,
          PostText: post.body_text,
          imgPath: image_path(post),
          dateTime: post.date_time&.iso8601,
          generatedDatumId: post&.generated_datum_id,
          toneId: generation&.tone_id,
          toneName: generation&.tone&.name,
          is_tone_active: generation&.tone&.is_active,
          styleId: generation&.style_id,
          styleName: generation&.style&.name,
          is_style_active: generation&.style&.is_active,
          prompt: generation&.prompt,
          companyId: generation&.company_id,
          companyName: generation&.company&.name,
          rating: generation&.rating
        }
      end
    }
  end

  def self.image_path(post)
    return nil unless post.post_image.attached?

    Rails.application.routes.url_helpers.rails_blob_path(post.post_image, only_path: true)
  end
end