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

function _denovo_discover() {
	for directory in $DENOVO_PATH; do
		for s in $directory/denovo/*/main.ts; do
			local script=$s
			local plugin=${script:h:t}
			if [[ $plugin == @* ]]; then
				# ignore if plugin name starts with @ as special case
				continue
			fi
			denovo-load "$plugin" "$script"
		done
	done
}
