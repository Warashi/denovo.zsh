# denovo_dispatch callback name method ...params
_denovo_dispatch_callback=""
function denovo_dispatch() {
	local callback="$1"
	shift
	_denovo_dispatch $callback dispatch "$(_denovo_json_string_array $@)"
}

function _denovo_dispatch() {
	local callback="$1"
	shift
	local method="$1"
	local params="$2"
	if [[ -z "$params" ]]; then
		params='[]'
	fi
	local request="$(_denovo_request "$method" "$params" 1)"
	_denovo_dispatch_callback="$callback"
	__denovo_dispatch "$request"
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
	echo "$request" >&$fd
	zle -F $fd __denovo_dispatch_receive
}

function __denovo_dispatch_receive() {
	local fd=$1
	zle -F $fd
	if [[ -n "$_denovo_dispatch_callback" ]]; then
		local REPLY="$(<&$fd)"
		eval "$_denovo_dispatch_callback"
		_denovo_dispatch_callback=""
	else
		cat <&$fd
	fi
	exec {fd}>&-
}
