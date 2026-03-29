class PostsController < ApplicationController
  def create
    safe_params = post_params
    post = AiGenerator::PostCreatorService.new.create_post(safe_params)

    if post.persisted?
      render json: { message: "Post creato con successo!", id: post.id }, status: :ok
    else
      render json: { error: "Errore durante la creazione del post." }, status: :unprocessable_entity
    end
  end

  def index
    posts = Post.includes(:generated_datum).all.order(date_time: :desc)
    render json: PostSerializer.serialize_collection(posts), status: :ok
  end

  def destroy
    @post = Post.find_by(id: params[:id])
    
    if @post && @post.destroy
      render json: { message: "Post eliminato con successo!" }, status: :ok
    else
      render json: { error: "Errore durante l'eliminazione del post." }, status: :bad_request
    end
  end

  private

  def post_params
    params.permit(:title, :body_text, :img_path, :date_time, :generated_datum_id)
  end
end