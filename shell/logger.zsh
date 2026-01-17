# console.log
function _denovo_logger_log() {
	logger -t denovo -p user.notice -- "$@"
}

# console.info
function _denovo_logger_info() {
	logger -t denovo -p user.info -- "$@"
}

# console.debug
function _denovo_logger_debug() {
	logger -t denovo -p user.debug -- "$@"
}

# console.warn
function _denovo_logger_warn() {
	logger -t denovo -p user.warning -- "$@"
}

# console.error
function _denovo_logger_error() {
	logger -t denovo -p user.error -- "$@"
}
