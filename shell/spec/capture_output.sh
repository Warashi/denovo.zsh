Describe '_denovo_capture_command_output'
	Include ./capture_command.zsh

	Describe '_denovo_capture_command_output'
		It 'keeps side effects in the current shell'
			DENOVO_TEST_MARK=''
			_denovo_test_side_effect() {
				DENOVO_TEST_MARK='changed'
			}
			When call _denovo_capture_command_output output _denovo_test_side_effect
			The variable DENOVO_TEST_MARK should equal 'changed'
			The variable output should eq ''
		End
	End
End
