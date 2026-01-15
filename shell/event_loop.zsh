function _denovo_event_loop() {
	local current_dispatch_id="$1"
	shift

	if [[ -z $current_dispatch_id ]]; then
		current_dispatch_id=-1
	fi

	while read -u ${DENOVO_DENO_COPROC_STDOUT} -r line; do
		if _denovo_handle_event_line "$current_dispatch_id" "$line"; then
			echo -E "$line"
			return
		fi
	done
}

function _denovo_handle_event_line() {
	local current_dispatch_id="$1"
	shift
	local line="$1"
	shift

	# handle method calls
	if _denovo_json_is_method_call "$line"; then
		_denovo_handle_method "${DENOVO_DENO_COPROC_STDIN}" "$line"
		return 1
	fi

	# handle responses
	local id
	echo -E "$line" | _denovo_query_json id - 'id'

	if ((id != current_dispatch_id)); then
		# not the response we're looking for
		_denovo_dispatch_callback "$id" "$line"
		return 1
	fi

	return 0
}

function _denovo_event_pump_once() {
	local fd="$1"
	shift

	local line
	if ! IFS= read -t 0 -u "$fd" -r line; then
		return 1
	fi

	_denovo_handle_event_line -1 "$line"
	return 0
}

function _denovo_event_pump() {
	local fd="$1"
	shift

	while _denovo_event_pump_once "$fd"; do
		:
	done
}

function _denovo_enable_event_pump() {
	if [[ ! -o interactive ]]; then
		return 1
	fi

	if ! builtin whence -w zle >/dev/null 2>&1; then
		return 1
	fi

	zle -F ${DENOVO_DENO_COPROC_STDOUT} _denovo_event_pump
}

function _denovo_disable_event_pump() {
	if [[ ! -o interactive ]]; then
		return 1
	fi

	if ! builtin whence -w zle >/dev/null 2>&1; then
		return 1
	fi

	zle -F ${DENOVO_DENO_COPROC_STDOUT}
}
