Describe '_denovo_query_json'
	Include ./query.zsh

	It 'extracts value from JSON'
		json='{"name": "John", "age": 30}'
		When call _denovo_query_json REPLY "$json" 'name'
		The variable REPLY should equal '"John"'
	End

	It 'minifies JSON into reply variable'
		json=' { "name" : "John" , "age" : 30 } '
		When call _denovo_query_json_minify REPLY "$json"
		The variable REPLY should equal '{"name":"John","age":30}'
	End

	It 'extracts string containing space from JSON'
		json='{"name": "John Smith", "age": 30}'
		When call _denovo_query_json REPLY "$json" 'name'
		The variable REPLY should equal '"John Smith"'
	End

	It 'extracts nested value from JSON'
		json='{"person": {"name": "John", "age": 30}}'
		When call _denovo_query_json REPLY "$json" 'person' 'name'
		The variable REPLY should equal '"John"'
	End

	It 'extracts array value from JSON'
		json='{"names": ["John", "Jane", "Doe"]}'
		When call _denovo_query_json REPLY "$json" 'names' 1
		The variable REPLY should equal '"Jane"'
	End

	It 'returns null for non-existent key'
		json='{"name": "John", "age": 30}'
		When call _denovo_query_json REPLY "$json" 'address'
		The variable REPLY should equal null
	End

	It 'handles empty JSON'
		json='{}'
		When call _denovo_query_json REPLY "$json"
		The variable REPLY should equal '{}'
	End

	It 'handles empty JSON with key'
		json='{}'
		When call _denovo_query_json REPLY "$json" 'name'
		The variable REPLY should equal null
	End

	It 'handles null'
		json='null'
		When call _denovo_query_json REPLY "$json" 'name'
		The variable REPLY should equal null
	End

	It 'handles array'
		json='["John", "Jane", "Doe"]'
		When call _denovo_query_json REPLY "$json" 1
		The variable REPLY should equal '"Jane"'
	End

	It 'handles nested array'
		json='[["John", "Jane"], ["Doe", "Smith"]]'
		When call _denovo_query_json REPLY "$json" 1 1
		The variable REPLY should equal '"Smith"'
	End

	It 'handles last element of array'
		json='["John", "Jane", "Doe"]'
		When call _denovo_query_json REPLY "$json" 2
		The variable REPLY should equal '"Doe"'
	End

	It 'handles number as key'
		json='{"1": "John", "2": "Jane"}'
		When call _denovo_query_json REPLY "$json" 2
		The variable REPLY should equal '"Jane"'
	End

	It 'returns null for non-numeric key for array'
		json='["John", "Jane", "Doe"]'
		When call _denovo_query_json REPLY "$json" 'name'
		The variable REPLY should equal null
	End

	It 'handles index out of range'
		json='["John", "Jane", "Doe"]'
		When call _denovo_query_json REPLY "$json" 3
		The variable REPLY should equal null
	End

	It 'handles number values'
		json='{"age": 30}'
		When call _denovo_query_json REPLY "$json" 'age'
		The variable REPLY should equal 30
	End

	It 'handles extracting object from object'
		json='{"person": {"name": "John", "age": 30}}'
		When call _denovo_query_json REPLY "$json" 'person'
		The variable REPLY should equal '{"name":"John","age":30}'
	End

	It 'handles extracting array from object'
		json='{"person": ["John", "Jane", "Doe"]}'
		When call _denovo_query_json REPLY "$json" 'person'
		The variable REPLY should equal '["John","Jane","Doe"]'
	End

	It 'handles extracting object from array'
		json='[{"name": "John", "age": 30}]'
		When call _denovo_query_json REPLY "$json" 0
		The variable REPLY should equal '{"name":"John","age":30}'
	End

	It 'handles extracting array from array'
		json='[["John", "Jane", "Doe"]]'
		When call _denovo_query_json REPLY "$json" 0
		The variable REPLY should equal '["John","Jane","Doe"]'
	End

	It 'handles stdin'
		Data
			#|{"name":"John","age":30}
		End
		When call _denovo_query_json REPLY -
		The variable REPLY should equal '{"name":"John","age":30}'
	End
End
