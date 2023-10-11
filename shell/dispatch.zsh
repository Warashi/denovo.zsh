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

typeset -g -i _denovo_fd=-1
function _denovo_connect() {
	local REPLY
	local -i isok
	zmodload zsh/net/socket
	zsocket "$DENOVO_DENO_SOCK" >&/dev/null
	isok=$?
	((isok == 0)) || return 1
	_denovo_fd=$REPLY
	zle -F -w $_denovo_fd _denovo_accept_result
}

function _denovo_accept_result() {
	local REPLY

	read -u $1 -r REPLY
	__denovo_dispatch_callback "$REPLY"
}
zle -N _denovo_accept_result

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
	local -i fd ready isok id

	if (( _denovo_fd < 0 )); then
		_denovo_connect
		isok=$?
		((isok == 0)) || return 1
	fi

	echo -E "$request" >&$_denovo_fd

	if [[ -z "$dispatch_id" ]]; then
		# no dispatch_id means we're not expecting a response
		return
	fi

	if [[ -n "$callback" ]]; then
		# callback means we're expecting a response, but we're not going to wait
		__denovo_register_callback $dispatch_id "$callback"
		return
	fi

	_denovo_event_loop "$dispatch_id"
}

typeset -g -A _denovo_dispatch_callbacks
function __denovo_register_callback() {
	local dispatch_id=$1
	local callback=$2
	_denovo_dispatch_callbacks[$dispatch_id]="$callback"
}

function __denovo_dispatch_callback() {
	local REPLY=$1
	id=$(echo -E "$REPLY" | jq -r '.id')
	echo -E "$REPLY" | eval "${_denovo_dispatch_callbacks[$id]}"
	unset "_denovo_dispatch_callbacks[$id]"
}

function _denovo_event_loop() {
	local dispatch_id="$1"

	zmodload zsh/zselect
	while zselect -r $_denovo_listen_fd -r $_denovo_fd 2>>${DENOVO_ROOT}/zsh.log; do
		ready_fd=${(s/ /)reply[2]}

		if (( ready_fd == $_denovo_listen_fd )); then
			_denovo_accept $_denovo_listen_fd
			continue
		fi

		read -u $_denovo_fd -r REPLY
		id=$(echo -E "$REPLY" | jq -r '.id')

		if (( id != dispatch_id )); then
			# not the response we're looking for
			__denovo_dispatch_callback "$REPLY"
			continue
		fi

		echo -E "$REPLY"
		return
	done
}

