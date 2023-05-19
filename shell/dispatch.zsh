function denovo_dispatch() {
  local method=$1
  local params=$2
  if [[ -z "$params" ]]; then
    params='[]'
  fi
  local request=$(jq -c -n --arg method "${method}" --argjson params "${params}" '{jsonrpc:"2.0",id:1,method:$method,params:$params}')
  _denovo_dispatch "$request"
}

function _denovo_dispatch() {
  local REPLY
  local -i isok fd
  zmodload zsh/net/socket
  zsocket "$DENOVO_DENO_SOCK"
  isok=$?
  (( isok == 0 )) || return 1
  fd=$REPLY
  echo "$1" >&$fd
  cat <&$fd
  exec {fd}>&-
}
