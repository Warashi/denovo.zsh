function _denovo_jo_string() {
  local str="$1"
  str="${str//\\/\\\\}"
  str="${str//$'\t'/\\t/}"
  str="${str//$'\n'/\\n}"
  str="${str//$'\r'/\\r}"
  str="${str//\"/\\\"}"
  str=${str//$'\b'/\\b}
  str=${str//$'\f'/\\f}
  builtin printf '"%s"' "$str"
}

function _denovo_jo_number() {
  local num="$1"
  if [[ "$num" == '' ]]; then
    builtin printf '0'
    return
  fi
  if [[ "$num" == *.* ]]; then
    builtin printf '%s' "$num"
    return
  fi
  builtin printf '%d' "$num"
}

function _denovo_jo_boolean() {
  local bool="$1"
  if [[ "$bool" == 'true' ]]; then
    builtin printf 'true'
    return
  fi
  builtin printf 'false'
}

function _denovo_jo_null() {
  builtin printf 'null'
}

function _denovo_jo_json() {
  builtin printf '%s' "$1"
}

function _denovo_jo_guess() {
  local value="$1"
  case "$value" in
    'true' | 'false') _denovo_jo_boolean "$value" ;;
    '' | 'null') _denovo_jo_null ;;
    '['*']' | '{'*'}') _denovo_jo_json "$value" ;;
    '.' | *.*.* | *[!0-9.]*) _denovo_jo_string "$value" ;;
    *) _denovo_jo_number "$value" ;;
  esac
}

function _denovo_jo_value() {
  local value="$1"
  case "$value" in
    -s)
      builtin shift
      _denovo_jo_string "$1"
      ;;
    -n)
      builtin shift
      _denovo_jo_number "$1"
      ;;
    -b)
      builtin shift
      _denovo_jo_boolean "$1"
      ;;
    *)
      _denovo_jo_guess "$1"
      ;;
  esac
}

function _denovo_jo_array() {
  local -a result=()
  for item in $@; do
    result+=("$item")
  done
  builtin printf '['
  for ((i = 1; i <= ${#result}; i++)); do
    case "$result[$i]" in
      '-s' | '-n' | '-b')
        builtin printf '%s' "$(_denovo_jo_value $result[$i] $result[$((i + 1))])"
        ((i++))
        ;;
      *)
        builtin printf '%s' "$(_denovo_jo_value $result[$i])"
        ;;
    esac
    if ((i != ${#result})); then
      builtin printf ','
    fi
  done
  builtin printf ']'
}

function _denovo_jo_object() {
  local -a result=()
  for item in $@; do
    result+=("$item")
  done
  builtin printf '{'
  for ((i = 1; i <= ${#result}; i++)); do
    case "$result[$i]" in
      '-s' | '-n' | '-b')
        builtin printf '%s' "$(_denovo_jo_kv $result[$i] $result[$((i + 1))])"
        ((i++))
        ;;
      *)
        builtin printf '%s' "$(_denovo_jo_kv $result[$i])"
        ;;
    esac
    if ((i != ${#result})); then
      builtin printf ','
    fi
  done
  builtin printf '}'
}

# parse a key-value pair
# argument k=v represents a key-value pair
# default type is guessed by value format
# specify type by prefixing word with -s for string, -n for number, or -b for boolean.
function _denovo_jo_kv() {
  if [[ "$1" != *"="* && "$2" != *"="* ]]; then
    return 1
  fi
  case "$1" in
    -s | -n | -b)
      local opt="$1"
      local keyvalue="$2"
      local key="${keyvalue%%=*}"
      local value="${keyvalue#*=}"
      key=$(_denovo_jo_string "$key")
      value=$(_denovo_jo_value "$opt" "$value")
      builtin printf '%s:%s' "$key" "$value"
      ;;
    *)
      local keyvalue="$1"
      local key="${keyvalue%%=*}"
      local value="${keyvalue#*=}"
      key=$(_denovo_jo_string "$key")
      value=$(_denovo_jo_guess "$value")
      builtin printf '%s:%s' "$key" "$value"
      ;;
  esac
}

function _denovo_jo() {
  if ((# < 1)); then
    builtin printf '{}'
    return
  fi

  if ([[ $1 == '-a' ]]); then
    builtin shift
    _denovo_jo_array "$@"
    return
  fi

  _denovo_jo_object "$@"
  builtin printf '\n'
}