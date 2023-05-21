# denovo_dispatch name method ...params
function denovo_dispatch() {
	_denovo_dispatch dispatch "$(_denovo_json_string_array $@)"
}

function _denovo_dispatch() {
	local method=$1
	local params=$2
	if [[ -z "$params" ]]; then
		params='[]'
	fi
	local request="$(_denovo_request "$method" "$params" 1)"
	__denovo_dispatch "$request" 0
}

function __denovo_dispatch() {
	local request=$1
	local REPLY
	local -i isok fd
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	fd=$REPLY
	echo "$1" >&$fd
	cat <&$fd
	exec {fd}>&-
}
