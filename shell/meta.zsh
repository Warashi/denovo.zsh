function _denovo_meta() {
	local mode
	local platform
	_denovo_mode mode
	_denovo_host_platform platform
	_denovo_jo -s mode="$mode" -s host="zsh" -s version="$ZSH_VERSION" -s platform="$platform"
}

function _denovo_mode() {
	local reply_var="$1"
	if [[ $DENOVO_DEBUG == "true" ]]; then
		builtin print -r -n -v "$reply_var" -- "debug"
	else
		builtin print -r -n -v "$reply_var" -- "release"
	fi
}

function _denovo_host_platform() {
	local reply_var="$1"
	if [[ $OSTYPE == "linux-gnu"* ]]; then
		builtin print -r -n -v "$reply_var" -- "linux"
	elif [[ $OSTYPE == "darwin"* ]]; then
		builtin print -r -n -v "$reply_var" -- "mac"
	elif [[ $OSTYPE == "cygwin" ]]; then
		builtin print -r -n -v "$reply_var" -- "windows"
	elif [[ $OSTYPE == "msys" ]]; then
		builtin print -r -n -v "$reply_var" -- "windows"
	elif [[ $OSTYPE == "win32" ]]; then
		builtin print -r -n -v "$reply_var" -- "windows"
	else
		builtin print -r -n -v "$reply_var" -- "unknown"
	fi
}
