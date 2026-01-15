typeset -g -A _denovo_callbacks

function _denovo_register_callback() {
	local call_id="$1"
	shift
	local callback="$1"
	shift

	_denovo_callbacks[$call_id]="$callback"
}

function _denovo_dispatch_callback() {
	local call_id="$1"
	shift
	local response="$1"
	shift

	local callback="${_denovo_callbacks[$call_id]}"
	if [[ -z $callback ]]; then
		return
	fi

	builtin echo -E "$response" | $callback

	unset "_denovo_callbacks[$call_id]"
}
