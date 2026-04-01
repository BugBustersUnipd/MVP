class User < ApplicationRecord
	has_one :employee

	# Metodo di supporto per i test.
	# Employee has no code field, so fall back to username
	def employee_code
		username
	end
end
