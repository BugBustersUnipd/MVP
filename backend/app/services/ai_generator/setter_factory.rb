module AiGenerator
class SetterFactory
  # Costruisce i dati di output per il flusso corrente.
  def create_text_setter(params_data)
    TextParamsSetterService.new(params_data)
  end

  # Costruisce i dati di output per il flusso corrente.
  def create_image_setter(params_data)
    ImageParamsSetterService.new(params_data)
  end
end
end
