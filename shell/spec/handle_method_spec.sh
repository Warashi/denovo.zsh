Describe '_denovo_handle_method'
	Include ./jo.zsh
	Include ./query.zsh
	Include ./unquote.zsh
	Include ./handle_method.zsh
	Include ./capture_command.zsh

	Describe 'call_function'
		It 'evaluates the code and do not sends response'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","method":"call_function","params":["eval","echo"]}'
			The output should eq ''
		End

		It 'evaluates the code and sends response with exit_code 0 and empty output'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"call_function","params":["true"]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"result":{"exit_code":0,"output":null}}'
		End

		It 'evaluates the code and sends response with exit_code 0 and non-empty output'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"call_function","params":["echo","output"]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"result":{"exit_code":0,"output":"output"}}'
		End

		It 'evaluates the code and sends response with exit_code 1 and empty output'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"call_function","params":["false"]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"result":{"exit_code":1,"output":null}}'
		End

		It 'evaluates the code and sends response with exit_code 1 and non-empty output'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"call_function","params":["eval","echo output; false"]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"result":{"exit_code":1,"output":"output"}}'
		End

		It 'evaluates the code and sends response with exit_code 0 and JSON output'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"call_function","params":["echo","{}"]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"result":{"exit_code":0,"output":{}}}'
		End
	End

	Describe 'batch_call_function'
		It 'batch evaluation'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"batch_call_functions","params":[[["true"],["false"],["echo","output"],["eval","echo output; false"],["echo","{}"]]]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"result":[{"exit_code":0,"output":null},{"exit_code":1,"output":null},{"exit_code":0,"output":"output"},{"exit_code":1,"output":"output"},{"exit_code":0,"output":{}}]}'
		End
	End

	Describe 'not_found'
		It 'returns error when method is not found'
			When call _denovo_handle_method 1 '{"jsonrpc":"2.0","id":1,"method":"not_found","params":["echo"]}'
			The output should eq '{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}'
		End
	End
End
