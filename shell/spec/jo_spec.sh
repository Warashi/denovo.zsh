Describe 'jo.zsh'
	Include ./jo.zsh

	Describe 'array construction'
		It 'array to json'
			When call __denovo_jo -a 1 2 3 4 5
			The output should eq '[1,2,3,4,5]'
		End
	End

	Describe 'object construction'
		It 'object to json'
			When call __denovo_jo a=1 b=2 c=3 d=4 e=5
			The output should eq '{"a":1,"b":2,"c":3,"d":4,"e":5}'
		End
	End

	Describe 'empty object construction'
		It 'empty object to json'
			When call __denovo_jo
			The output should eq '{}'
		End
	End

	Describe 'specify type of args'
		It 'string type'
			When call __denovo_jo -s a=1 -s b=2 -s c=3 -s d=4 -s e=5
			The output should eq '{"a":"1","b":"2","c":"3","d":"4","e":"5"}'
		End

		It 'number type'
			When call __denovo_jo -n a=1 -n b=2 -n c=3 -n d=4 -n e=5
			The output should eq '{"a":1,"b":2,"c":3,"d":4,"e":5}'
		End

		It 'float type'
			When call __denovo_jo -n a=1.1 -n b=2.2 -n c=3.3 -n d=4.4 -n e=5.5
			The output should eq '{"a":1.1,"b":2.2,"c":3.3,"d":4.4,"e":5.5}'
		End

		It 'boolean type'
			When call __denovo_jo -b a=true -b b=false -b c=true -b d=false -b e=true
			The output should eq '{"a":true,"b":false,"c":true,"d":false,"e":true}'
		End

		It 'typed array'
			When call __denovo_jo -a 1 -s 2 -b true -n 1.2 -n 5
			The output should eq '[1,"2",true,1.2,5]'
		End

		It 'mixed type'
			When call __denovo_jo -s a=1 -n b=2 -b c=true -s d=4 -n e=5
			The output should eq '{"a":"1","b":2,"c":true,"d":"4","e":5}'
		End

		It 'missing values'
			When call __denovo_jo -s a= -n b= -b c=
			The output should eq '{"a":"","b":0,"c":false}'
		End

		It 'json values'
			When call __denovo_jo a='{"a":1}' b='[1,2,3]' c='{"a":1}'
			The output should eq '{"a":{"a":1},"b":[1,2,3],"c":{"a":1}}'
		End

		It 'guess type'
			When call __denovo_jo a=a b=\"2\" c=3 d=true e=false f=null
			The output should eq '{"a":"a","b":"\"2\"","c":3,"d":true,"e":false,"f":null}'
		End

		It 'multiline strings'
			When call __denovo_jo a='a'$'\n''b'
			The output should eq '{"a":"a\nb"}'
		End
	End

	Describe '-v option'
		It 'assigns output to variable and does not print to stdout'
			var_output=''
			When call _denovo_jo -v var_output a=1 b=2
			The variable var_output should eq '{"a":1,"b":2}'
			The output should eq ''
		End

		It 'works with array output'
			var_output=''
			When call _denovo_jo -v var_output -a 1 2 3
			The variable var_output should eq '[1,2,3]'
			The output should eq ''
		End

		It 'works with custom implementation when jo is not available'
			var_output=''
			PATH=/dev/null:$PATH # joコマンドを見つからないようにする
			When call _denovo_jo -v var_output a=1
			The variable var_output should eq '{"a":1}'
			The output should eq ''
		End
	End

	Describe '__denovo_jo -v option'
		It 'assigns output to variable and does not print to stdout'
			var_output=''
			When call __denovo_jo -v var_output a=1 b=2
			The variable var_output should eq '{"a":1,"b":2}'
			The output should eq ''
		End
	End
End
