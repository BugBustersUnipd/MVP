class SetterFactory
  def create_text_setter(params_data)
    TextParamsSetterService.new(params_data)
  end

  def create_image_setter(params_data)
    ImageParamsSetterService.new(params_data)
  end
end