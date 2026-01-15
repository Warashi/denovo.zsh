Describe '_denovo_jsonrpc2_construct_error'
	Include ./jo.zsh
	Include ./jsonrpc2.zsh

	It 'constructs error with code and message only'
		When call _denovo_jsonrpc2_construct_error 123 'msg'
		The output should equal '{"code":123,"message":"msg"}'
	End

	It 'constructs error with code, message, and data'
		When call _denovo_jsonrpc2_construct_error 123 'msg' 'data'
		The output should equal '{"code":123,"message":"msg","data":"data"}'
	End
End

Describe '_denovo_jsonrpc2_construct_response'
	Include ./jo.zsh
	Include ./jsonrpc2.zsh

	It 'constructs response with result'
		When call _denovo_jsonrpc2_construct_response '1' 'result' ''
		The output should equal '{"jsonrpc":"2.0","id":1,"result":"result"}'
	End

	It 'constructs response with error'
		When call _denovo_jsonrpc2_construct_response '1' '' 'error'
		The output should equal '{"jsonrpc":"2.0","id":1,"error":"error"}'
	End
End

Describe '_denovo_json_is_method_call'
	Include ./query.zsh
	Include ./jsonrpc2.zsh

	It 'returns 0 for method call'
		When call _denovo_json_is_method_call '{"jsonrpc":"2.0","method":"test"}'
		The status should be success
	End

	It 'returns 1 for response type'
		When call _denovo_json_is_method_call '{"jsonrpc":"2.0","id":1,"result":"result"}'
		The status should be failure
	End

	It 'reads from stdin and returns 0 for method call'
		Data
			#|{"jsonrpc":"2.0","method":"test"}
		End
		When call _denovo_json_is_method_call -
		The status should be success
	End

	It 'reads from stdin and returns 1 for response type'
		Data
			#|{"jsonrpc":"2.0","id":1,"result":"result"}
		End
		When call _denovo_json_is_method_call -
		The status should be failure
	End
End
