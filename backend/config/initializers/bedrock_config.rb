# Configurazione per AWS Bedrock Text Generation
BEDROCK_CONFIG_GENERATION = {
  "model_id" => "amazon.nova-pro",
  "region" => ENV["AWS_REGION"] || "us-east-1"
}.freeze

# Configurazione per AWS Bedrock Image Generation (Nova Canvas)
BEDROCK_CONFIG_IMAGE_GENERATION = {
  "model_id" => "amazon.nova-canvas-1:0",
  "region" => ENV["AWS_REGION"] || "us-east-1"
}.freeze
