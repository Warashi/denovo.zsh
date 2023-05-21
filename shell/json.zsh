function _denovo_json_string() {
  local arg=$1
  arg="${arg//\\/\\\\}"   # escape backslash
  arg="${arg//$'\n'/\\n}" # escape new-line
  arg="${arg//\"/\\\"}"   # escape quote
  arg="\"${^arg}\""       # quote
  echo "$arg"
}

function _denovo_json_kv() {
  local key=$1
  local value=$2

  key="$(_denovo_json_string "$key")"
  printf '%s:%s' "$key" "$value"
}

function _denovo_json_array() {
  printf '[%s]' "${(j:,:)@}"
}

function _denovo_json_object() {
  printf '{%s}' "${(j:,:)@}"
}

