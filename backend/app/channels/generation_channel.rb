class GenerationChannel < ApplicationCable::Channel
  def subscribed
    stream_from "generation_channel"
  end

  def unsubscribed
  end
end