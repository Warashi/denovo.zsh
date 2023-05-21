# denovo_notify name method ...params
function denovo_notify() {
	_denovo_notify dispatch "$(_denovo_json_string_array $@)"
}

function _denovo_notify() {
	local method=$1
	local params=$2
	if [[ -z "$params" ]]; then
		params='[]'
	fi
	local request="$(_denovo_request "$method" "$params")"
	__denovo_notify "$request"
}

function __denovo_notify() {
	local request=$1
	local REPLY
	local -i isok fd
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	fd=$REPLY
	echo "$1" >&$fd
	exec {fd}>&-
}
