Describe '_denovo_unquote_json'
	Include ./unquote.zsh

	It 'unquotes true'
		When call _denovo_unquote_json REPLY '"true"'
		The variable REPLY should equal 'true'
	End

	It 'unquotes false'
		When call _denovo_unquote_json REPLY '"false"'
		The variable REPLY should equal 'false'
	End

	It 'unquotes not quoted true'
		When call _denovo_unquote_json REPLY true
		The variable REPLY should equal 'true'
		The status should be failure
	End

	It 'unquotes not quoted false'
		When call _denovo_unquote_json REPLY false
		The variable REPLY should equal 'false'
		The status should be failure
	End

	It 'unquotes string'
		When call _denovo_unquote_json REPLY '"John"'
		The variable REPLY should equal 'John'
	End

	It 'unquotes string with spaces'
		When call _denovo_unquote_json REPLY '"John Doe"'
		The variable REPLY should equal 'John Doe'
	End

	It 'unquotes string with special characters'
		When call _denovo_unquote_json REPLY '"John Doe & Co."'
		The variable REPLY should equal 'John Doe & Co.'
	End

	It 'unquotes string with escaped quotes'
		When call _denovo_unquote_json REPLY '"John \"Doe\""'
		The variable REPLY should equal 'John "Doe"'
	End

	It 'unquotes string with escaped backslashes'
		When call _denovo_unquote_json REPLY '"John \\ Doe"'
		The variable REPLY should equal 'John \ Doe'
	End

	It 'unquotes string with escaped special characters'
		When call _denovo_unquote_json REPLY '"John \t Doe"'
		The variable REPLY should equal 'John 	 Doe'
	End

	It 'unquotes string with escaped unicode'
		When call _denovo_unquote_json REPLY '"John \u00A9 Doe"'
		The variable REPLY should equal 'John © Doe'
	End

	It 'fails for not quoted string'
		When call _denovo_unquote_json REPLY 'John'
		The variable REPLY should equal 'John'
		The status should be failure
	End

	It 'unquotes from stdin'
		Data
			#|"John"
		End
		When call _denovo_unquote_json REPLY -
		The variable REPLY should equal 'John'
	End
End
