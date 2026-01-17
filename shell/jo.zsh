function _denovo_jo_string() {
	local reply_var="$1"
	local str="$2"
	str="${str//\\/\\\\}"
	str="${str//$'\t'/\\t/}"
	str="${str//$'\n'/\\n}"
	str="${str//$'\r'/\\r}"
	str="${str//\"/\\\"}"
	str="${str//$'\b'/\\b}"
	str="${str//$'\f'/\\f}"
	str="${str//$'\0'/\\u0000}"
	builtin printf -v "$reply_var" '"%s"' "$str"
}

function _denovo_jo_number() {
	local reply_var="$1"
	local num="$2"
	if [[ $num == '' ]]; then
		builtin print -r -n -v "$reply_var" -- '0'
		return
	fi
	if [[ $num == *.* ]]; then
		builtin printf -v "$reply_var" '%s' "$num"
		return
	fi
	builtin printf -v "$reply_var" '%d' "$num"
}

function _denovo_jo_boolean() {
	local reply_var="$1"
	local bool="$2"
	if [[ $bool == 'true' ]]; then
		builtin print -r -n -v "$reply_var" -- 'true'
		return
	fi
	builtin print -r -n -v "$reply_var" -- 'false'
}

function _denovo_jo_null() {
	local reply_var="$1"
	builtin print -r -n -v "$reply_var" -- 'null'
}

function _denovo_jo_json() {
	local reply_var="$1"
	builtin print -r -n -v "$reply_var" -- "$2"
}

function _denovo_jo_guess() {
	local reply_var="$1"
	local value="$2"
	case "$value" in
	'true' | 'false') _denovo_jo_boolean "$reply_var" "$value" ;;
	'' | 'null') _denovo_jo_null "$reply_var" ;;
	'['*']' | '{'*'}') _denovo_jo_json "$reply_var" "$value" ;;
	'.' | *.*.* | *[!0-9.]*) _denovo_jo_string "$reply_var" "$value" ;;
	*) _denovo_jo_number "$reply_var" "$value" ;;
	esac
}

function _denovo_jo_value() {
	local reply_var="$1"
	shift
	local value="$1"
	case "$value" in
	-s)
		builtin shift
		_denovo_jo_string "$reply_var" "$1"
		;;
	-n)
		builtin shift
		_denovo_jo_number "$reply_var" "$1"
		;;
	-b)
		builtin shift
		_denovo_jo_boolean "$reply_var" "$1"
		;;
	*)
		_denovo_jo_guess "$reply_var" "$1"
		;;
	esac
}

function _denovo_jo_array() {
	local reply_var="$1"
	shift
	local -a items=()
	for item in $@; do
		items+=("$item")
	done
	local json='['
	local value_json
	for ((i = 1; i <= ${#items}; i++)); do
		case "$items[$i]" in
		'-s' | '-n' | '-b')
			_denovo_jo_value value_json $items[$i] $items[$((i + 1))]
			json+="$value_json"
			((i++))
			;;
		*)
			_denovo_jo_value value_json $items[$i]
			json+="$value_json"
			;;
		esac
		if ((i != ${#items})); then
			json+=','
		fi
	done
	json+=']'
	builtin print -r -n -v "$reply_var" -- "$json"
}

function _denovo_jo_object() {
	local reply_var="$1"
	shift
	local -a pairs=()
	for item in $@; do
		pairs+=("$item")
	done
	local json='{'
	local kv_json
	for ((i = 1; i <= ${#pairs}; i++)); do
		case "$pairs[$i]" in
		'-s' | '-n' | '-b')
			_denovo_jo_kv kv_json $pairs[$i] $pairs[$((i + 1))]
			json+="$kv_json"
			((i++))
			;;
		*)
			_denovo_jo_kv kv_json $pairs[$i]
			json+="$kv_json"
			;;
		esac
		if ((i != ${#pairs})); then
			json+=','
		fi
	done
	json+='}'
	builtin print -r -n -v "$reply_var" -- "$json"
}

# parse a key-value pair
# argument k=v represents a key-value pair
# default type is guessed by value format
# specify type by prefixing word with -s for string, -n for number, or -b for boolean.
function _denovo_jo_kv() {
	local reply_var="$1"
	shift
	if [[ $1 != *"="* && $2 != *"="* ]]; then
		return 1
	fi
	case "$1" in
	-s | -n | -b)
		local opt="$1"
		local keyvalue="$2"
		local key="${keyvalue%%=*}"
		local value="${keyvalue#*=}"
		local key_json
		local value_json
		_denovo_jo_string key_json "$key"
		_denovo_jo_value value_json "$opt" "$value"
		builtin printf -v "$reply_var" '%s:%s' "$key_json" "$value_json"
		;;
	*)
		local keyvalue="$1"
		local key="${keyvalue%%=*}"
		local value="${keyvalue#*=}"
		local key_json
		local value_json
		_denovo_jo_string key_json "$key"
		_denovo_jo_guess value_json "$value"
		builtin printf -v "$reply_var" '%s:%s' "$key_json" "$value_json"
		;;
	esac
}

function __denovo_jo() {
	local reply_var=''
	if [[ $1 == '-v' ]]; then
		reply_var="$2"
		shift 2
	fi

	local result
	local add_newline=false
	if [[ $# -eq 0 ]]; then
		result='{}'
	elif ([[ $1 == '-a' ]]); then
		builtin shift
		_denovo_jo_array result "$@"
	else
		_denovo_jo_object result "$@"
		add_newline=true
	fi

	if [[ -n $reply_var ]]; then
		builtin print -r -n -v "$reply_var" -- "$result"
		return
	fi

	if $add_newline; then
		builtin printf '%s\n' "$result"
	else
		builtin printf '%s' "$result"
	fi
}

if which jo >/dev/null; then
	# If jo is available, use it
	_denovo_jo() {
		local varname=""
		if [[ $1 == "-v" ]]; then
			varname="$2"
			shift 2
		fi
		if [[ -n $varname ]]; then
			_denovo_capture_command_output "$varname" jo "$@"
		else
			jo "$@"
		fi
	}
else
	# Otherwise, use the custom implementation
	_denovo_jo() {
		local varname=""
		if [[ $1 == "-v" ]]; then
			varname="$2"
			shift 2
		fi
		if [[ -n $varname ]]; then
			__denovo_jo -v "$varname" "$@"
		else
			__denovo_jo "$@"
		fi
	}
fi
