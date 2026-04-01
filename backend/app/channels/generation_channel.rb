class GenerationChannel < ApplicationCable::Channel
  # Esegue la logica applicativa del metodo.
  def subscribed
    stream_from "generation_channel"
  end

  # Esegue la logica applicativa del metodo.
  def unsubscribed
  end
end