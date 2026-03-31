class TemplatesController < ApplicationController
  # GET /templates
  def index
    templates = Template.order(:id).select(:id, :subject)
    render json: { templates: templates.as_json(only: [:id, :subject]) }
  end

  # GET /templates/:id
  def show
    template = Template.find(params[:id])
    render json: {
      template: {
        id: template.id,
        subject: template.subject,
        body: template.body
      }
    }
  rescue ActiveRecord::RecordNotFound
    render json: { status: "error", message: "Template non trovato" }, status: :not_found
  end

  # POST /templates
  def create
    t = Template.new(template_params)
    if t.save
      render json: {
        status: "ok",
        template: {
          id: t.id,
          subject: t.subject,
          body: t.body
        }
      }, status: :created
    else
      render json: { status: "error", errors: t.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def template_params
    params.permit(:subject, :body)
  end
end
