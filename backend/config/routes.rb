Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check


  # Test servizi
  get "/documents/test", to: "documents#test", as: :test_documents
  post "/documents/split", to: "documents#split", as: :split_documents
  post "/documents/process_file", to: "documents#process_file", as: :process_file_documents
  get "/documents/uploads/:uploaded_document_id/extracted", to: "documents#extracted_index", as: :uploaded_document_extracted_documents
  get "/documents/uploads", to: "documents#uploads", as: :uploaded_documents
  get "/documents/uploads/:id/file", to: "documents#uploaded_file", as: :uploaded_document_file
  get "/documents/extracted/:id", to: "documents#extracted_show", as: :extracted_document
  get "/documents/extracted/:id/pdf", to: "documents#extracted_pdf", as: :extracted_pdf_document
  patch "/documents/extracted/:id/reassign_range", to: "documents#reassign_range", as: :reassign_extracted_document_range
  patch "/documents/extracted/:id/metadata", to: "documents#update_metadata", as: :update_extracted_document_metadata
  patch "/documents/extracted/:id/validate", to: "documents#validate_extracted", as: :validate_extracted_document
  post   "/documents/uploads/:id/retry",    to: "documents#retry_processing",  as: :retry_processing
  post   "/documents/extracted/:id/retry",  to: "documents#retry_extracted",   as: :retry_extracted
  delete "/documents/uploads/:id",          to: "documents#destroy_upload",    as: :destroy_upload

  # Lookups: aziende e utenti
  get "/lookups/companies", to: "lookups#companies", as: :lookups_companies
  get "/lookups/users", to: "lookups#users", as: :lookups_users

  # Sendings (invii)
  get "/sendings", to: "sendings#index", as: :sendings
  post "/sendings", to: "sendings#create", as: :create_sending

  # Templates (modelli di invio)
  get "/templates", to: "templates#index", as: :templates
  get "/templates/:id", to: "templates#show", as: :template
  post "/templates", to: "templates#create", as: :create_template

  # Modulo AI generativo
  # 
  # Tones
  get "/tones", to: "tones#index", as: :tones
  post "/tones", to: "tones#create", as: :create_tone
  delete "/tones/:id", to: "tones#destroy", as: :destroy_tone

  # Styles
  get "/styles", to: "styles#index", as: :styles
  post "/styles", to: "styles#create", as: :create_style
  delete "/styles/:id", to: "styles#destroy", as: :destroy_style

  # Posts
  get "/posts", to: "posts#index", as: :posts
  post "/posts", to: "posts#create", as: :create_post
  delete "/posts/:id", to: "posts#destroy", as: :destroy_post

  # Generated Data
  post "/generated_data", to: "generated_data#create", as: :create_generated_data
  post "/generated_data/:id/regenerate", to: "generated_data#regenerate", as: :regenerate_generated_data
  get "/generated_data/:id", to: "generated_data#show", as: :generated_data
  patch "/generated_data/:id/rating", to: "generated_data#rating", as: :rating_generated_data
  delete "/generated_data/:id", to: "generated_data#destroy", as: :destroy_generated_data
  # Data Analyst

  get 'ai_generator_data_analyst', to: 'ai_generator_data_analyst#index'
  get 'ai_copilot_data_analyst', to: 'ai_copilot_data_analyst#index'


  # Defines the root path route ("/")
  root "documents#test"
end
