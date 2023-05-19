function _denovo_listen() {
  local REPLY
  local -i isok fd
  rm -f "${DENOVO_ZSH_SOCK}"
  zmodload zsh/net/socket
  zsocket -l "${DENOVO_ZSH_SOCK}"
  isok=$?
  (( isok == 0 )) || return 1
  fd=$REPLY
  zle -F $fd _denovo_accept
}

function _denovo_accept() {
  local REPLY request method params
  local -i isok fd
  zsocket -a $1
  isok=$?
  (( isok == 0 )) || return 1
  fd=$REPLY
  eval "$(<&$fd)" >&$fd
  exec {fd}>&-
}

_denovo_listen
