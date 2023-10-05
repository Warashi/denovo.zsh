#!/usr/bin/env zsh

: ${DENOVO_ROOT:=${0:a:h}}
: ${DENOVO_SOCK_DIR:="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/denovo-${UID}"}
: ${DENOVO_DENO_SOCK::="${DENOVO_SOCK_DIR}/denovo-${$}.deno.sock"}
: ${DENOVO_ZSH_SOCK::="${DENOVO_SOCK_DIR}/denovo-${$}.zsh.sock"}
export DENOVO_ROOT DENOVO_SOCK_DIR DENOVO_DENO_SOCK DENOVO_ZSH_SOCK

if [[ ! -d ${DENOVO_SOCK_DIR} ]]; then
	mkdir -p "${DENOVO_SOCK_DIR}"
fi
"${DENOVO_SERVER_BIN:-${DENOVO_ROOT}/bin/denovo-server}" >>"${DENOVO_ROOT}/denovo.log" 2>&1 &!

typeset -gaU DENOVO_PATH
DENOVO_PATH+=("${DENOVO_ROOT}")

source "${DENOVO_ROOT}/shell/json.zsh"
source "${DENOVO_ROOT}/shell/listen.zsh"
source "${DENOVO_ROOT}/shell/dispatch.zsh"
source "${DENOVO_ROOT}/shell/register.zsh"

function denovo-stop-server() {
	if [[ -n "$_DENOVO_DENO_PID" ]]; then
		kill "$_DENOVO_DENO_PID"
	fi
	rm -f "$DENOVO_ZSH_SOCK"
}

autoload -Uz add-zsh-hook
add-zsh-hook zshexit denovo-stop-server
