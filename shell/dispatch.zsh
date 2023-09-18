# denovo-dispatch name method ...params
function denovo-dispatch() {
	_denovo_dispatch dispatch "$(_denovo_json_string_array $@)"
}

# denovo-notify name method ...params
function denovo-notify() {
	_denovo_notify dispatch "$(_denovo_json_string_array $@)"
}

# denovo-dispatch-async callback name method ...params
function denovo-dispatch-async() {
	local callback="$1"; shift;
	_denovo_dispatch dispatch "$(_denovo_json_string_array $@)" "$callback"
}


function _denovo_notify() {
	local method="$1"
	local params="$2"
	if [[ -z "$params" ]]; then
		params='[]'
	fi
	local request="$(_denovo_request "$method" "$params")"
	__denovo_dispatch "$request"
}

typeset -g -i _denovo_dispatch_id=0
function _denovo_dispatch() {
	local dispatch_id=$(( ++_denovo_dispatch_id ))
	local method="$1"
	local params="$2"
	local callback="$3"
	if [[ -z "$params" ]]; then
		params='[]'
	fi
	local request="$(_denovo_request "$method" "$params" $dispatch_id)"
	__denovo_dispatch "$request" $dispatch_id "$callback"
}

function __denovo_dispatch() {
	local request="$1"
	local dispatch_id="$2"
	local callback="$3"
	local REPLY
	local -i isok fd ready
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	fd=$REPLY
	echo -E "$request" >&$fd
	if [[ -z "$dispatch_id" ]]; then
		# close file descriptor in callback
		__denovo_register_callback $fd ""
	elif [[ -n "$callback" ]]; then
		__denovo_register_callback $fd "$callback"
	else
		zmodload zsh/zselect
		while zselect -r $_denovo_listen_fd -r $fd 2>>${DENOVO_ROOT}/zsh.log; do
			ready_fd=${(s/ /)reply[2]}
			if (( ready_fd == $fd )); then
				cat <&$ready_fd
				exec {fd}>&-
				break
			else
				_denovo_accept $ready_fd
			fi
		done
	fi
}

typeset -g -A _denovo_dispatch_callbacks
function __denovo_register_callback() {
	local fd=$1
	local callback=$2
	_denovo_dispatch_callbacks[$fd]="$callback"
	zle -F $fd __denovo_dispatch_callback
}

function __denovo_dispatch_callback() {
	local fd=$1
	local callback=${_denovo_dispatch_callbacks[$fd]}
	zle -F $fd
	if [[ -n "$callback" ]]; then
		eval "$callback" <&$fd
	fi
	exec {fd}>&-
}
