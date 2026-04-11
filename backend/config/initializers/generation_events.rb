ActiveSupport::Notifications.subscribe("generation.lifecycle") do |*args|
  payload = args.last
  AiGenerator::GenerationNotifier.new.broadcast(payload)
end
