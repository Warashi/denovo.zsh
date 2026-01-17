function denovo-load() {
	local plugin="$1"
	builtin shift
	local script="$1"
	builtin shift

	local args
	_denovo_jo -v args -a "$plugin" "$script"
	local params
	_denovo_jo -v params -a "load" "$args"
	local request
	_denovo_jo -v "request" -s jsonrpc="2.0" -s method="invoke" params="$params"

	__denovo_dispatch "$request"
}

function _denovo_path() {
	printf '%s\0' "${DENOVO_PATH[@]}"
}
