Describe '_denovo_event_pump_once'
	Include ./callback.zsh
	Include ./event_loop.zsh
	Include ./jsonrpc2.zsh
	Include ./query.zsh

	It 'dispatches callbacks for responses'
		callback_output=''
		denovo_test_callback() {
			callback_output="$(cat)"
		}

		_denovo_register_callback 1 denovo_test_callback

		response='{"jsonrpc":"2.0","id":1,"result":"ok"}'
		exec {denovo_fd}<<<"$response"

		When call _denovo_event_pump_once "$denovo_fd"
		The status should be success
		The variable callback_output should eq "$response"
	End
End
