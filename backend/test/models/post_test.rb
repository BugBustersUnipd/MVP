require "test_helper"

class PostTest < ActiveSupport::TestCase
  def build_post(overrides = {})
    datum = generated_data(:one)
    Post.new({ generated_datum: datum, title: "Test Post", body_text: "Content" }.merge(overrides))
  end

  test "fixture one is accessible" do
    post = posts(:one)
    assert_not_nil post
    assert_not_nil post.id
  end

  test "valid post saves successfully" do
    post = build_post
    assert post.valid?
    post.save!
    assert post.persisted?
  end

  test "requires generated_datum" do
    post = build_post(generated_datum: nil)
    assert_not post.valid?
    assert post.errors[:generated_datum].any?
  end

  test "belongs_to generated_datum" do
    post = posts(:one)
    assert_equal generated_data(:one), post.generated_datum
  end

  test "title can be stored and retrieved" do
    post = build_post(title: "My Awesome Post")
    post.save!
    assert_equal "My Awesome Post", post.reload.title
  end

  test "body_text can be stored and retrieved" do
    post = build_post(body_text: "Long post content goes here")
    post.save!
    assert_equal "Long post content goes here", post.reload.body_text
  end

  test "img_path is optional" do
    post = build_post(img_path: nil)
    assert post.valid?
  end

  test "img_path can be set" do
    post = build_post(img_path: "/images/post_img.jpg")
    post.save!
    assert_equal "/images/post_img.jpg", post.reload.img_path
  end
end
