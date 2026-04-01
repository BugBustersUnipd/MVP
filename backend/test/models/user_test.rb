require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "employee_code returns username when user has no employee" do
    user = User.new(username: "mario99")
    assert_equal "mario99", user.employee_code
  end

  test "employee_code returns username via employee when employee has no employee_code method" do
    user = users(:one)
    
    assert_equal user.username, user.employee_code
  end

  test "has_one :employee association" do
    user = users(:one)
    assert_respond_to user, :employee
    assert_equal employees(:one), user.employee
  end
end
