function _denovo_jsonrpc2_construct_error {
	local error_code="$1"
	shift
	local error_message="$1"
	shift
	local error_data="$1"
	if [[ -n $error_data ]]; then
		local error_json
		_denovo_jo -v error_json code="$error_code" -s message="$error_message" data="$error_data"
		print -r -n -- "$error_json"
	else
		local error_json
		_denovo_jo -v error_json code="$error_code" -s message="$error_message"
		print -r -n -- "$error_json"
	fi
}

function _denovo_jsonrpc2_construct_response {
	local call_id="$1"
	shift
	local result="$1"
	shift
	local error="$1"
	shift

	local response_json
	if [[ -n $error ]]; then
		_denovo_jo -v response_json -s jsonrpc=2.0 id="$call_id" error="$error"
	else
		_denovo_jo -v response_json -s jsonrpc=2.0 id="$call_id" result="$result"
	fi
	print -r -n -- "$response_json"
}

function _denovo_json_is_method_call {
	local json="$1"

	if [[ $json == '-' ]]; then
		IFS= builtin read -r json
	fi

	local version
	_denovo_query_json version "$json" 'jsonrpc'

	if [[ $version != '"2.0"' ]]; then
		return 1
	fi

	local method
	_denovo_query_json method "$json" 'method'
	if [[ $method == 'null' ]]; then
		return 1
	fi

	return 0
}
