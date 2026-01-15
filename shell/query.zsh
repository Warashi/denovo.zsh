# public function: JSON を階層的にたどって値を取り出す
function _denovo_query_json {
	local reply_var="$1"
	shift
	local json="$1"
	shift

	# stdin から読み取る
	if [[ $json == '-' ]]; then
		IFS= builtin read -r json
	fi

	# 空文字列なら null
	if [[ -z $json ]]; then
		builtin print -r -n -v $reply_var -- 'null'
		return
	fi

	# 引数が無い場合はそのまま出力 (そのまま返す)
	if [[ $# -eq 0 ]]; then
		builtin print -r -n -v $reply_var -- "$json"
		return
	fi

	# 配列のとき
	if [[ $json == '['*']' ]]; then
		local index="$1"
		shift

		# インデックスが数値でない場合は null
		if ! [[ $index =~ ^[0-9]+$ ]]; then
			builtin print -r -n -v $reply_var -- 'null'
			return
		fi

		# 配列をパースし、要素を格納
		_denovo_query_json_parse_array REPLY "$json"
		local -a array=("${REPLY[@]}")

		# インデックス範囲外は null
		if ((index >= ${#array[@]})); then
			builtin print -r -n -v $reply_var -- 'null'
			return
		fi

		# zsh 配列は 1-origin なので調整
		((index++))

		# 再帰的にたどる
		_denovo_query_json "$reply_var" "${array[$index]}" "$@"
		return
	fi

	# オブジェクトのとき
	if [[ $json == '{'*'}' ]]; then
		local key="$1"
		shift

		# オブジェクトをパースし、連想配列として格納
		_denovo_query_json_parse_object REPLY "$json"
		local -A object=(${REPLY})

		# 該当キーが無い場合は null
		if [[ -z ${object[$key]+_} ]]; then
			builtin print -r -n -v "$reply_var" -- 'null'
			return
		fi

		# 再帰的にたどる
		_denovo_query_json "$reply_var" "${object[$key]}" "$@"
		return
	fi

	# 文字列 / 数値 / boolean / null
	builtin print -r -n -v "$reply_var" -- "$json"
}

#
# JSON配列をパースして要素を配列として格納する
#  - 例: [ "John", 30, ["nested"] ] -> ("\"John\"" "30" "[\"nested\"]")
#
function _denovo_query_json_parse_array() {
	local reply_var="$1"
	local original_json="$2"

	# JSONを最小限に整形しておく（スペース除去など）
	local json
	_denovo_query_json_minify json "$original_json"

	# 先頭 '['、末尾 ']' でなければ失敗
	if [[ $json != \[*\]* ]]; then
		return 1
	fi

	# 中身を取り出す ([ と ] を除去)
	local inner="${json:1:-1}"

	# トップレベルでカンマ区切りする
	local -a items

	# カンマで分割した結果を改行単位で出力しているので、IFS=$'\n' で1要素化する
	_denovo_query_json_split_top_level items "$inner" ","

	# 結果を返す
	eval "$reply_var"='("${items[@]}")'
}

#
# JSONオブジェクトをパースして key -> value を連想配列として格納する
#  - 例: {"name":"John","age":30} ->
#       ( "name" => "\"John\"" "age" => "30" )
#
function _denovo_query_json_parse_object() {
	local reply_var="$1"
	local original_json="$2"

	local json
	_denovo_query_json_minify json "$original_json"

	# 先頭 '{'、末尾 '}' でなければ失敗
	if [[ $json != \{*\} ]]; then
		return 1
	fi

	local inner="${json:1:-1}"

	# トップレベルでカンマ区切りされた "key":"value" のペア
	local -a pairs

	# --- ここを修正 ---
	_denovo_query_json_split_top_level pairs "$inner" ","

	local -A out
	local pair
	for pair in "${pairs[@]}"; do
		# さらにトップレベルのコロンで key と value に分割
		local colon_index=-1
		if _denovo_query_json_find_top_level_colon "$pair"; then
			colon_index=$REPLY
		fi

		# 不正 (コロンが見つからない) 場合は無視
		if ((colon_index < 0)); then
			continue
		fi

		# zsh の文字列スライスは 0-origin（substring展開は）だが、_denovo_query_json_find_top_level_colon が
		# 1-based で i を走査し REPLY に (i-1) を返しているため、そのまま substring に使える
		local key="${pair:0:$colon_index+0}"
		local val="${pair:$colon_index+1}"

		# key と val はさらに minify する (念のため)
		_denovo_query_json_minify key "$key"
		_denovo_query_json_minify val "$val"

		# JSON では key はダブルクォート文字列のはずなので外側の "" を外す
		if [[ $key == \"*\" && $key != '"' ]]; then
			key="${key:1:-1}"
		fi

		# 連想配列へ格納。value はサブ JSON としてそのまま保持
		out[$key]="$val"
	done

	eval "$reply_var"='(${(kv)out})'
}

#
# JSON文字列を最小限に整形する
#   - 文字列リテラル内部はそのまま残す
#   - それ以外の場所の空白を削除
#   - 簡易な実装であり、複雑なエスケープには未対応
#
function _denovo_query_json_minify() {
	local reply_var="$1"
	shift
	local in="$1"

	local out=""
	local in_string=false
	local escaped=false
	local c
	local len=${#in}

	for ((i = 1; i <= len; i++)); do
		c=${in[i]}

		if $in_string; then
			out+="$c"
			if $escaped; then
				escaped=false
			else
				if [[ $c == '\' ]]; then
					escaped=true
				elif [[ $c == '"' ]]; then
					# 文字列終わり
					in_string=false
				fi
			fi
		else
			# 文字列リテラル外
			if [[ $c == '"' ]]; then
				# 文字列開始
				out+="$c"
				in_string=true
			elif [[ $c =~ [[:space:]] ]]; then
				# 空白は削除
				continue
			else
				out+="$c"
			fi
		fi
	done

	builtin print -r -n -v "$reply_var" -- "$out"
}

#
# トップレベルの区切り文字(カンマなど)で split する
#   - [ { や " などのネスト・文字列の中はスキップして分割
#
function _denovo_query_json_split_top_level() {
	local reply_var="$1"
	shift
	local str="$1"
	local sep="$2"

	local -a out
	local token=""
	local level=0
	local in_string=false
	local escaped=false
	local c
	local len=${#str}

	for ((i = 1; i <= len; i++)); do
		c=${str[i]}
		if $in_string; then
			token+="$c"
			if $escaped; then
				escaped=false
			else
				if [[ $c == '\' ]]; then
					escaped=true
				elif [[ $c == '"' ]]; then
					in_string=false
				fi
			fi
		else
			# 文字列外
			case "$c" in
			'"')
				token+="$c"
				in_string=true
				;;
			"[" | "{")
				((level++))
				token+="$c"
				;;
			"]" | "}")
				((level--))
				token+="$c"
				;;
			"$sep")
				# トップレベルでの sep のみ分割
				if ((level == 0)); then
					out+="$token"
					token=""
				else
					token+="$c"
				fi
				;;
			*)
				token+="$c"
				;;
			esac
		fi
	done

	# 最後のトークンを追加
	out+="$token"

	eval "$reply_var"='("${out[@]}")'
}

#
# オブジェクトのペア内部で、トップレベルのコロン ':' の位置を探す
#  - 見つかった場合は 0-origin の位置を REPLY にセットし、ステータス 0 で return
#  - 見つからない場合は REPLY=-1 のまま、ステータス 1 で return
#
function _denovo_query_json_find_top_level_colon() {
	local str="$1"

	local in_string=false
	local escaped=false
	local c
	local level=0
	local len=${#str}

	REPLY=-1 # 初期値

	# zsh では文字列添字は 1-origin (ただし substring展開は 0-origin)
	for ((i = 1; i <= len; i++)); do
		c=${str[i]}

		if $in_string; then
			if $escaped; then
				escaped=false
			else
				if [[ $c == '\' ]]; then
					escaped=true
				elif [[ $c == '"' ]]; then
					in_string=false
				fi
			fi
		else
			# 文字列外
			case "$c" in
			'"')
				in_string=true
				;;
			"[" | "{")
				((level++))
				;;
			"]" | "}")
				((level--))
				;;
			":")
				if ((level == 0)); then
					REPLY=$((i - 1)) # 0-origin で返す
					return 0
				fi
				;;
			esac
		fi
	done

	return 1
}
