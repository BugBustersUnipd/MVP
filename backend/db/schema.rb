# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_27_130000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "companies", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "employees", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.string "department"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["company_id"], name: "index_employees_on_company_id"
    t.index ["user_id"], name: "index_employees_on_user_id"
  end

  create_table "extracted_documents", force: :cascade do |t|
    t.jsonb "confidence"
    t.datetime "created_at", null: false
    t.text "error_message"
    t.bigint "matched_employee_id"
    t.jsonb "metadata"
    t.integer "page_end"
    t.integer "page_start"
    t.decimal "process_time_seconds"
    t.datetime "processed_at"
    t.text "recipient"
    t.integer "sequence"
    t.string "status"
    t.datetime "updated_at", null: false
    t.bigint "uploaded_document_id", null: false
    t.index ["matched_employee_id"], name: "index_extracted_documents_on_matched_employee_id"
    t.index ["status"], name: "index_extracted_documents_on_status"
    t.index ["uploaded_document_id", "sequence"], name: "index_extracted_documents_on_uploaded_document_id_and_sequence", unique: true
    t.index ["uploaded_document_id"], name: "index_extracted_documents_on_uploaded_document_id"
  end

  create_table "generated_data", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.datetime "data_time"
    t.decimal "generation_time"
    t.integer "height"
    t.string "img_path"
    t.text "prompt"
    t.decimal "rating"
    t.string "seed"
    t.string "status"
    t.bigint "style_id", null: false
    t.text "text_result"
    t.string "title"
    t.bigint "tone_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "version_id"
    t.integer "width"
    t.index ["company_id"], name: "index_generated_data_on_company_id"
    t.index ["style_id"], name: "index_generated_data_on_style_id"
    t.index ["tone_id"], name: "index_generated_data_on_tone_id"
    t.index ["version_id"], name: "index_generated_data_on_version_id"
  end

  create_table "posts", force: :cascade do |t|
    t.text "body_text"
    t.datetime "created_at", null: false
    t.datetime "date_time"
    t.bigint "generated_datum_id", null: false
    t.string "img_path"
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["generated_datum_id"], name: "index_posts_on_generated_datum_id"
  end

  create_table "processing_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error_message"
    t.bigint "extracted_document_id"
    t.string "filename"
    t.bigint "processing_run_id", null: false
    t.integer "sequence", null: false
    t.string "status"
    t.datetime "updated_at", null: false
    t.index ["extracted_document_id"], name: "index_processing_items_on_extracted_document_id"
    t.index ["processing_run_id", "sequence"], name: "index_processing_run_id_and_sequence", unique: true
    t.index ["processing_run_id"], name: "index_processing_items_on_processing_run_id"
    t.index ["status"], name: "index_processing_items_on_status"
  end

  create_table "processing_runs", force: :cascade do |t|
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.text "error_message"
    t.string "job_id"
    t.string "original_filename"
    t.integer "processed_documents"
    t.datetime "started_at"
    t.string "status"
    t.integer "total_documents"
    t.datetime "updated_at", null: false
    t.bigint "uploaded_document_id"
    t.index ["job_id"], name: "index_processing_runs_on_job_id", unique: true
    t.index ["status"], name: "index_processing_runs_on_status"
    t.index ["uploaded_document_id"], name: "index_processing_runs_on_uploaded_document_id"
  end

  create_table "sendings", force: :cascade do |t|
    t.text "body"
    t.datetime "created_at", null: false
    t.bigint "extracted_document_id", null: false
    t.bigint "recipient_id", null: false
    t.datetime "sent_at"
    t.string "subject"
    t.bigint "template_id"
    t.datetime "updated_at", null: false
    t.index ["extracted_document_id"], name: "index_sendings_on_extracted_document_id"
    t.index ["recipient_id"], name: "index_sendings_on_recipient_id"
    t.index ["template_id"], name: "index_sendings_on_template_id"
  end

  create_table "styles", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_styles_on_company_id"
  end

  create_table "templates", force: :cascade do |t|
    t.text "body_text"
    t.datetime "created_at", null: false
    t.text "subject"
    t.datetime "updated_at", null: false
  end

  create_table "tones", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_tones_on_company_id"
  end

  create_table "uploaded_documents", force: :cascade do |t|
    t.string "category"
    t.string "checksum"
    t.string "competence_period"
    t.datetime "created_at", null: false
    t.bigint "employee_id"
    t.string "file_kind"
    t.string "original_filename"
    t.string "override_company"
    t.string "override_department"
    t.integer "page_count", default: 0
    t.string "storage_path"
    t.datetime "updated_at", null: false
    t.index ["checksum"], name: "index_uploaded_documents_on_checksum", unique: true
    t.index ["employee_id"], name: "index_uploaded_documents_on_employee_id"
    t.index ["file_kind"], name: "index_uploaded_documents_on_file_kind"
  end

  create_table "users", force: :cascade do |t|
    t.string "cf"
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name"
    t.string "password"
    t.string "surname"
    t.datetime "updated_at", null: false
    t.string "username"
  end

  add_foreign_key "employees", "companies"
  add_foreign_key "employees", "users"
  add_foreign_key "extracted_documents", "uploaded_documents"
  add_foreign_key "extracted_documents", "users", column: "matched_employee_id"
  add_foreign_key "generated_data", "companies"
  add_foreign_key "generated_data", "styles"
  add_foreign_key "generated_data", "tones"
  add_foreign_key "posts", "generated_data"
  add_foreign_key "processing_items", "extracted_documents"
  add_foreign_key "processing_items", "processing_runs"
  add_foreign_key "processing_runs", "uploaded_documents"
  add_foreign_key "sendings", "extracted_documents"
  add_foreign_key "sendings", "templates"
  add_foreign_key "sendings", "users", column: "recipient_id"
  add_foreign_key "styles", "companies"
  add_foreign_key "tones", "companies"
  add_foreign_key "uploaded_documents", "employees"
end
