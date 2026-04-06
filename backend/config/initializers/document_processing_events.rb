ActiveSupport::Notifications.subscribe("document_processing.lifecycle") do |*args|
  payload = args.last
  DocumentProcessing::ActionCableNotifier.new.broadcast(payload[:job_id], payload.except(:job_id))
end
