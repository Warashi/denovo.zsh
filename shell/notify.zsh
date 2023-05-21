function denovo_notify() {
	local method=$1
	local params=$2
	if [[ -z "$params" ]]; then
		params='[]'
	fi
  local request="$(_denovo_request "$method" "$params")"
	_denovo_notify "$request" 0
}

function _denovo_notify() {
	local request=$1
	local retry=$2
	local REPLY
	local -i isok fd
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_SOCK" >&/dev/null
	isok=$?
	if ((isok != 0)); then
		if ((retry > 3)); then
			return 1
		fi
		sleep 0.01
		((retry++))
		_denovo_notify "$request" $retry
		return $?
	fi
	fd=$REPLY
	echo "$1" >&$fd
	exec {fd}>&-
}

