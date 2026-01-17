#!/usr/bin/env zsh

if [[ -z ${DENOVO_ROOT} ]]; then
	DENOVO_ROOT=${0:a:h}
fi
export DENOVO_ROOT

if [[ -z ${DENOVO_TMPDIR} ]]; then
	DENOVO_TMPDIR="${TMPDIR:-/tmp}/denovo.$$"
fi
export DENOVO_TMPDIR
mkdir -p "${DENOVO_TMPDIR}"

typeset -gaU DENOVO_PATH
DENOVO_PATH+=("${DENOVO_ROOT}")

coproc "${DENOVO_SERVER_BIN:-${DENOVO_ROOT}/bin/denovo-server}"
_DENOVO_DENO_PID=$!
exec 3>&p 4<&p
disown

DENOVO_DENO_COPROC_STDIN=3
DENOVO_DENO_COPROC_STDOUT=4

source "${DENOVO_ROOT}/shell/callback.zsh"
source "${DENOVO_ROOT}/shell/capture_command.zsh"
source "${DENOVO_ROOT}/shell/dispatch.zsh"
source "${DENOVO_ROOT}/shell/event_loop.zsh"
source "${DENOVO_ROOT}/shell/handle_method.zsh"
source "${DENOVO_ROOT}/shell/jo.zsh"
source "${DENOVO_ROOT}/shell/jsonrpc2.zsh"
source "${DENOVO_ROOT}/shell/meta.zsh"
source "${DENOVO_ROOT}/shell/query.zsh"
source "${DENOVO_ROOT}/shell/register.zsh"
source "${DENOVO_ROOT}/shell/unquote.zsh"

function denovo-cleanup() {
	if [[ -n $_DENOVO_DENO_PID ]]; then
		kill "$_DENOVO_DENO_PID"
	fi
	_denovo_disable_event_pump >/dev/null 2>&1
	rm -rf "${DENOVO_TMPDIR}"
}

autoload -Uz add-zsh-hook
add-zsh-hook zshexit denovo-cleanup

_denovo_enable_event_pump >/dev/null 2>&1
