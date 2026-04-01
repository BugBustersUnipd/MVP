require "simplecov"
SimpleCov.start "rails" do
  enable_coverage :branch
  add_filter "/test/"
  add_filter "/config/"
  add_filter "/vendor/"
  add_group "Models",      "app/models"
  add_group "Controllers", "app/controllers"
  add_group "Services",    "app/document_processing"
end

ENV["RAILS_ENV"] ||= "test"


ENV["AWS_EC2_METADATA_DISABLED"] = "true"
ENV["AWS_ACCESS_KEY_ID"] ||= "test"
ENV["AWS_SECRET_ACCESS_KEY"] ||= "test"
ENV["AWS_REGION"] ||= "us-east-1"

require_relative "../config/environment"
require "rails/test_help"
require 'mocha/minitest'

module ActiveSupport
  class TestCase
    
    parallelize(workers: :number_of_processors)

    # Merge SimpleCov results da each parallel worker
    parallelize_setup do |worker|
      SimpleCov.command_name "#{SimpleCov.command_name}-#{worker}"
    end

    parallelize_teardown do |_worker|
      SimpleCov.result
    end

    # Preparazione dati di test.
    fixtures :all

    # Metodo di supporto per i test.

    
    
    def stub_new(klass, instance)
      original = klass.method(:new)
      klass.define_singleton_method(:new) { |*_args, **_kwargs| instance }
      yield
    ensure
      klass.define_singleton_method(:new, original)
    end
  end
end
