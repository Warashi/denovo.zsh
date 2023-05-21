function denovo_register() {
  local plugin=$1
  local script=$2
  local request="$(_denovo_json_array $(_denovo_json_string $plugin) $(_denovo_json_string $script))"
  denovo_notify "register" "$request"
}

function _denovo_discover() {
  local -a denovo_path=(${(s/:/)DENOVO_PATH})
  for p in $denovo_path; do
    for s in $p/denovo/*/main.ts; do
      local script=$s
      local plugin=$(basename $(dirname $script))
      if [[ $plugin = @* ]]; then
        # ignore if plugin name starts with @ as special case
        continue
      fi
      denovo_register $plugin $script
    done
  done
}
