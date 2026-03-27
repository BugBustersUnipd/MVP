class Template < ApplicationRecord
	# compat helper: older code expects `template.body` while current schema has `body_text`
	alias_attribute :body, :body_text
end
