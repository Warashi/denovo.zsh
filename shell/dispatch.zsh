# denovo-dispatch plugin method ...params
function denovo-dispatch() {
	local plugin="$1"
	builtin shift
	local method="$1"
	builtin shift
	local -a args=("$@")

	_denovo_dispatch '' "$plugin" "$method" "${args[@]}"
}

# denovo-notify plugin method ...params
function denovo-notify() {
	local plugin="$1"
	builtin shift
	local method="$1"
	builtin shift
	local -a args=("$@")

	_denovo_notify '' "$plugin" "$method" "${args[@]}"
}

# denovo-dispatch-async callback plugin method ...params
function denovo-dispatch-async() {
	local callback="$1"
	builtin shift
	local plugin="$1"
	builtin shift
	local method="$1"
	builtin shift
	local -a args=("$@")

	_denovo_dispatch "$callback" "$plugin" "$method" "${args[@]}"
}

function _denovo_dispatch_request() {
	local reply_var="$1"
	builtin shift
	local id="$1"
	builtin shift
	local plugin="$1"
	builtin shift
	local method="$1"
	builtin shift

	local args='[]'
	_denovo_jo -v args -a "$@"

	local dispatch_args
	_denovo_jo -v dispatch_args -a "$plugin" "$method" "$args"

	local params
	_denovo_jo -v params -a "dispatch" "$dispatch_args"

	local request_json
	if [[ -n $id ]]; then
		_denovo_jo -v request_json -s jsonrpc="2.0" -n id="$id" -s method="invoke" params="$params"
	else
		_denovo_jo -v request_json -s jsonrpc="2.0" -s method="invoke" params="$params"
	fi
	builtin print -r -n -v "$reply_var" -- "$request_json"
}

function _denovo_notify() {
	local callback="$1"
	builtin shift
	local plugin="$1"
	builtin shift
	local method="$1"
	builtin shift
	local -a args=("$@")

	local request
	_denovo_dispatch_request request '' "$plugin" "$method" "${args[@]}"
	__denovo_dispatch "$request"
}

typeset -g -i _denovo_dispatch_id=0
function _denovo_dispatch() {
	local dispatch_id=$((++_denovo_dispatch_id))
	local callback="$1"
	builtin shift
	local plugin="$1"
	builtin shift
	local method="$1"
	builtin shift
	local -a args=("$@")

	local request
	_denovo_dispatch_request request "$dispatch_id" "$plugin" "$method" "${args[@]}"
	__denovo_dispatch "$request" $dispatch_id "$callback"
}

function __denovo_dispatch() {
	local request="$1"
	local dispatch_id="$2"
	local callback="$3"

	echo -E "$request" >&${DENOVO_DENO_COPROC_STDIN}

	if [[ -z $dispatch_id ]]; then
		# no dispatch_id means we're not expecting a response
		return
	fi

	if [[ -n $callback ]]; then
		# callback means we're expecting a response, but we're not going to wait
		__denovo_register_callback $dispatch_id "$callback"
		return
	fi

	_denovo_event_loop "$dispatch_id"
}
