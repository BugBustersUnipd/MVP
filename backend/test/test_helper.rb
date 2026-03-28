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
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Merge SimpleCov results from each parallel worker
    parallelize_setup do |worker|
      SimpleCov.command_name "#{SimpleCov.command_name}-#{worker}"
    end

    parallelize_teardown do |_worker|
      SimpleCov.result
    end

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...

    # Temporarily replaces klass.new with a proc returning instance for the
    # duration of the block. Thread-safe enough for serial test runs.
    def stub_new(klass, instance)
      original = klass.method(:new)
      klass.define_singleton_method(:new) { |*_args, **_kwargs| instance }
      yield
    ensure
      klass.define_singleton_method(:new, original)
    end
  end
end
