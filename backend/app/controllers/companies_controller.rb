class CompaniesController < ApplicationController
  def index
    companies = Company.order(:id).select(:id, :name)
    render json: companies, status: :ok
  end
end
