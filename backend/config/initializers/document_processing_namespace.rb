# Load document_processing classes explicitly.
# Rails/Zeitwerk adds app/document_processing/ as a collapsed autoload root,
# which would map container.rb -> Container instead of DocumentProcessing::Container.
# We bypass that by requiring the files directly; the module DocumentProcessing
# wrapper inside each file handles constant definition correctly.
Dir[Rails.root.join("app/document_processing/**/*.rb")].sort.each do |file|
  require file
end
