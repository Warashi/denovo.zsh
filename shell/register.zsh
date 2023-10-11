function denovo-register() {
	local plugin=$1
	local directory=$2
	local script=$3
	local meta="$(_denovo_meta)"
	local request="$(_denovo_json_array "$(_denovo_json_string "$plugin")" "$(_denovo_json_string "$directory")" "$(_denovo_json_string "$script")" "$meta")"
	_denovo_notify "register" "$request" >/dev/null
}

function _denovo_meta() {
	_denovo_json_object \
		"$(_denovo_json_kv "mode" "$(_denovo_json_string "release")")" \
		"$(_denovo_json_kv "version" "$(_denovo_json_string "$ZSH_VERSION")")" \
		"$(_denovo_json_kv "platform" "$(_denovo_json_string "$(_denovo_host_platform)")")"
}

function _denovo_host_platform() {
	if [[ "$OSTYPE" == "linux-gnu"* ]]; then
		echo "linux"
	elif [[ "$OSTYPE" == "darwin"* ]]; then
		echo "mac"
	elif [[ "$OSTYPE" == "cygwin" ]]; then
		echo "windows"
	elif [[ "$OSTYPE" == "msys" ]]; then
		echo "windows"
	elif [[ "$OSTYPE" == "win32" ]]; then
		echo "windows"
	else
		echo "unknown"
	fi
}

function _denovo_discover() {
	for directory in $DENOVO_PATH; do
		for s in $directory/denovo/*/main.ts; do
			local script=$s
			local plugin=$(basename $(dirname $script))
			if [[ $plugin = @* ]]; then
				# ignore if plugin name starts with @ as special case
				continue
			fi
			denovo-register $plugin $directory $script
		done
	done
}
