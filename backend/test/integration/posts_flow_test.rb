require "test_helper"

class PostsFlowTest < ActionDispatch::IntegrationTest
  def setup
    @company = Company.create!(name: "Post Flow Company", description: "Flow company")
    @tone = Tone.create!(company: @company, name: "Post Tone", description: "Tone desc", is_active: true)
    @style = Style.create!(company: @company, name: "Post Style", description: "Style desc", is_active: true)

    @generation = GeneratedDatum.create!(
      company: @company,
      tone: @tone,
      style: @style,
      prompt: "Prompt post flow",
      status: "completed",
      title: "Titolo dal generator",
      text_result: "Testo dal generator",
      data_time: Time.current
    )

    base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PaAAAADElEQVQIHWP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    @generation.generated_image.attach(
      io: StringIO.new(Base64.decode64(base64)),
      filename: "generation.png",
      content_type: "image/png"
    )
  end

  test "create post copies generated image into post attachment" do
    assert_difference "Post.count", 1 do
      post create_post_path,
           params: {
             generated_datum_id: @generation.id
           },
           as: :json
    end

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["id"].present?

    post_record = Post.find(body["id"])
    assert post_record.post_image.attached?
    assert_equal "Titolo dal generator", post_record.title
    assert_equal "Testo dal generator", post_record.body_text
  end

  test "index returns post with active storage imgPath" do
    post_record = Post.create!(
      generated_datum: @generation,
      title: "Post indicizzato",
      body_text: "Body indicizzato",
      date_time: Time.current
    )
    post_record.post_image.attach(@generation.generated_image.blob)

    get posts_path, as: :json

    assert_response :ok
    body = JSON.parse(response.body)
    assert body.key?("posts")
    found = body["posts"].find { |p| p["id"] == post_record.id }
    assert_not_nil found
    assert found["imgPath"].present?
    assert_match(%r{^/rails/active_storage/blobs/}, found["imgPath"])
  end
end
