function _denovo_json_string() {
	local arg=$1
	arg="${arg//\\/\\\\}"   # escape backslash
	arg="${arg//$'\n'/\\n}" # escape new-line
	arg="${arg//$'\t'/\\t}" # escape tab
	arg="${arg//\"/\\\"}"   # escape quote
	arg="\"${^arg}\""       # quote
	echo -E "$arg"
}

function _denovo_json_kv() {
	local key=$1
	local value=$2

	key="$(_denovo_json_string "$key")"
	printf '%s:%s\n' "$key" "$value"
}

function _denovo_json_array() {
	printf '[%s]\n' "${(j:,:)@}"
}

function _denovo_json_string_array() {
	local -a result=()
	for item in $@; do
		result+=("$(_denovo_json_string "$item")")
	done
	echo -E "$(_denovo_json_array ${(@)result})"
}

function _denovo_json_object() {
	printf '{%s}\n' "${(j:,:)@}"
}

function _denovo_request() {
	local method=$1
	local params=$2
	local id=$3
	local jsonrpc_kv="$(_denovo_json_kv "jsonrpc" $(_denovo_json_string "2.0"))"
	local method_kv="$(_denovo_json_kv "method" $(_denovo_json_string "$method"))"
	local params_kv="$(_denovo_json_kv "params" $params)"
	if [[ -n "$id" ]]; then
		local id_kv="$(_denovo_json_kv "id" "$id")"
		local request=$(_denovo_json_object "$jsonrpc_kv" "$id_kv" "$method_kv" "$params_kv")
	else
		local request=$(_denovo_json_object "$jsonrpc_kv" "$method_kv" "$params_kv")
	fi
	echo -E "$request"
}
