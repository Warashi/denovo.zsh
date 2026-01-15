function _denovo_capture_command_output() {
	local reply_var="$1"
	shift
	local output_file="${DENOVO_TMPDIR}/denovo-capture.$RANDOM"
	"$@" >"$output_file"
	local exit_code=$?
	local line
	output="$(<$output_file)"
	output=${output%$'\n'}
	rm -f -- "$output_file"
	builtin print -r -n -v "$reply_var" -- "$output"
	return $exit_code
}
