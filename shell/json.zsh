function _denovo_printf (){
	builtin printf '%b' "$(builtin printf "$@")"
}

function _denovo_json_string() {
	_denovo_json_atom 'string' "$1"
}

function _denovo_json_atom() {
	local typ=$1
	local value=$2
	_denovo_printf '%s\n%s\n' "$1" "$2"
}

function _denovo_json_kv() {
	local key=$1
	local value=$2
	_denovo_printf '%s\n%s\n' "$key" "$value"
}

function _denovo_json_array() {
	_denovo_printf '%s\n%s\n%s\n' 'array-start' "${(j:\n:)@}" 'array-end'
}

function _denovo_json_string_array() {
	local -a result=()
	for item in $@; do
		result+=("$(_denovo_json_atom 'string' "$item")")
	done
	echo -E "$(_denovo_json_array ${(@)result})"
}

function _denovo_json_object() {
	_denovo_printf '%s\n%s\n%s\n' 'object-start' "${(j:\n:)@}" 'object-end'
}

function _denovo_construct_jsonvalue() {
	local value="$1"
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_JSON_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	fd=$REPLY
	local request="$(_denovo_printf '%s\n%s\n' 'construct-json' "$value")"
	print "$request" >&$fd
	local result="$(<&$fd)"
	echo -E "$result"
	exec {fd}<&-
}

function _denovo_request() {
	local method=$1
	local params=$2
	local id=$3
	local jsonrpc_kv="$(_denovo_json_kv "jsonrpc" "$(_denovo_json_atom string "2.0")")"
	local method_kv="$(_denovo_json_kv "method" "$(_denovo_json_atom string "$method")")"
	local params_kv="$(_denovo_json_kv "params" "$params")"
	if [[ -n "$id" ]]; then
		local id_kv="$(_denovo_json_kv "id" "$(_denovo_json_atom number "$id")")"
		local request="$(_denovo_construct_jsonvalue "$(_denovo_json_object "$jsonrpc_kv" "$id_kv" "$method_kv" "$params_kv")")"
	else
		local request="$(_denovo_construct_jsonvalue "$(_denovo_json_object "$jsonrpc_kv" "$method_kv" "$params_kv")")"
	fi
	echo -E "$request"
}
