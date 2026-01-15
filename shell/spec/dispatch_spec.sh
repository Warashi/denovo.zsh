Describe '_denovo_request'
	Include ./jo.zsh
	Include ./dispatch.zsh
	Include ./capture_command.zsh

	It 'builds request with id'
		request=''
		When call _denovo_dispatch_request request 1 "method" a b
		The variable request should eq '{"jsonrpc":"2.0","id":1,"method":"invoke","params":["dispatch",["method","a",["b"]]]}'
		The output should eq ''
	End

	It 'builds request without id'
		request=''
		When call _denovo_dispatch_request request '' "method" a b
		The variable request should eq '{"jsonrpc":"2.0","method":"invoke","params":["dispatch",["method","a",["b"]]]}'
		The output should eq ''
	End
End

Describe 'denovo-dispatch'
	Include ./jo.zsh
	Include ./dispatch.zsh
	Include ./capture_command.zsh

	__denovo_register_callback() {}
	_denovo_event_loop() {}

	DENOVO_DENO_COPROC_STDIN=1
	It 'send dispatch request'
		When call denovo-dispatch denovo-example echo a b c
		The output should eq '{"jsonrpc":"2.0","id":1,"method":"invoke","params":["dispatch",["denovo-example","echo",["a","b","c"]]]}'
	End
End

Describe 'denovo-notify'
	Include ./jo.zsh
	Include ./dispatch.zsh
	Include ./capture_command.zsh

	__denovo_register_callback() {}
	_denovo_event_loop() {}

	DENOVO_DENO_COPROC_STDIN=1
	It 'send notify request'
		When call denovo-notify denovo-example echo a b c
		The output should eq '{"jsonrpc":"2.0","method":"invoke","params":["dispatch",["denovo-example","echo",["a","b","c"]]]}'
	End
End
