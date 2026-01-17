function _denovo_handle_method {
	set -o pipefail

	local denovo_fd="$1"
	shift
	local request="$1"
	shift

	local id
	_denovo_query_json id "$request" id
	case "$id" in
	"null")
		_denovo_handle_notification "$denovo_fd" "$request"
		return
		;;
	*)
		_denovo_handle_request "$denovo_fd" "$request"
		return
		;;
	esac
}

function _denovo_handle_request {
	local denovo_fd="$1"
	shift
	local request="$1"
	shift

	local call_id
	local method_name
	local params
	_denovo_query_json call_id "$request" id
	_denovo_query_json method_name "$request" method
	_denovo_unquote_json method_name "$method_name"
	_denovo_query_json params "$request" params

	case "$method_name" in
	"call_function")
		local result
		_denovo_call_function result "$params"
		local response
		_denovo_jo -v response -s jsonrpc="2.0" id="$call_id" result="$result"
		print -r -- "$response" >&$denovo_fd
		return
		;;

	"batch_call_functions")
		local -a calls=()
		_denovo_query_json_parse_array calls "$params"
		if ((${#calls[@]} == 1)) && [[ ${calls[1]} == \[*\] ]]; then
			_denovo_query_json_parse_array calls "${calls[1]}"
		fi

		local -a results=()
		local result
		for call in "${calls[@]}"; do
			_denovo_call_function result "$call"
			results+=("$result")
		done

		local results_json
		_denovo_jo -v results_json -a ${results[@]}
		local response
		_denovo_jo -v response -s jsonrpc="2.0" id="$call_id" result="$results_json"
		print -r -- "$response" >&$denovo_fd
		return
		;;

	*)
		local error_json
		_denovo_jo -v error_json -n code=-32601 message="Method not found"
		local response
		_denovo_jo -v response -s jsonrpc="2.0" id="$call_id" error="$error_json"
		print -r -- "$response" >&$denovo_fd
		return
		;;
	esac
}

function _denovo_handle_notification {
	local denovo_fd="$1"
	shift
	local request="$1"
	shift

	local method_name
	local params
	_denovo_query_json method_name "$request" method
	_denovo_unquote_json method_name "$method_name"
	_denovo_query_json params "$request" params

	case "$method_name" in
	"call_function")
		local result_json
		_denovo_call_function result_json "$params"
		return
		;;

	"batch_call_functions")
		local -a calls=()
		_denovo_query_json_parse_array calls "$params"

		for call in "${calls[@]}"; do
			local result_json
			_denovo_call_function result_json "$call"
		done
		return
		;;

	*)
		# Ignore unknown notifications
		return
		;;
	esac
}

function _denovo_result {
	local reply_var="$1"
	shift
	local exit_code="$1"
	shift
	local output="$1"
	shift

	_denovo_jo -v "$reply_var" -n exit_code="$exit_code" output="$output"
}

function _denovo_call_function {
	local reply_var="$1"
	shift
	local params_json="$1"
	local -a params
	_denovo_unquote_array params "$params_json"

	local output
	_denovo_capture_command_output output "${params[@]}"
	local exit_code="$?"

	local result_json
	_denovo_result result_json "$exit_code" "$output"
	builtin print -r -n -v "$reply_var" -- "$result_json"
}
