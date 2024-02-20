function _denovo_request() {
	local id="$1"; builtin shift;
	local method="$1"; builtin shift;
	local params=$@
	if [[ -n "$id" ]]; then
		local request="$(_denovo_jo -s jsonrpc=2.0 id="$id" method="$method" params="$(_denovo_jo -a $@)")"
	else
		local request="$(_denovo_jo -s jsonrpc=2.0 method="$method" params="$(_denovo_jo -a $@)")"
	fi
	echo -E "$request"
}

function _denovo_query_json() {
	local field="$1"
	read -r -d '' json
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_JSON_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	fd=$REPLY
	local request="$(builtin printf '%s\n%s\n%s\n' 'query-json' "$field" "$json")"
	print "$request" >&$fd
	local result="$(<&$fd)"
	echo -E "$result"
	exec {fd}<&-
}

function _denovo_unquote_json() {
	read -r -d '' json
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_JSON_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	fd=$REPLY
	local request="$(builtin printf '%s\n%s\n' 'unquote-json' "$json")"
	print "$request" >&$fd
	local result="$(<&$fd)"
	echo -E "$result"
	exec {fd}<&-
}
