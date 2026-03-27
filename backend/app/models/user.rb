class User < ApplicationRecord
	has_one :employee

	# compat helper used by presenters/controllers expecting an `employee_code`
	# Employee has no code field, so fall back to username
	def employee_code
		username
	end
end
