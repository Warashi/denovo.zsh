function _denovo_unquote_json {
	local reply_var="$1"
	shift
	local json="$1"

	# 入力が '-' の場合、標準入力から文字列を読み取る
	if [[ $json == '-' ]]; then
		IFS= builtin read -r json
	fi

	# JSON文字列リテラルは先頭と末尾がダブルクォートかどうかをチェック
	if [[ $json != '"'*'"' ]]; then
		# JSON文字列リテラルでない場合はそのまま出力
		builtin printf -v "$reply_var" '%s' "$json"
		return 1
	fi

	# 先頭と末尾のダブルクォートを取り除く
	local s="${json:1:-1}"
	local length=${#s}
	local i=0
	local result=""

	# エスケープの展開
	while ((i < length)); do
		local ch="${s:$i+0:1}"
		if [[ $ch == '\' ]]; then
			((i++))
			# バックスラッシュの次の文字が存在しない場合は不正
			if ((i >= length)); then
				return 1
			fi

			local nextch="${s:$i+0:1}"
			case "$nextch" in
			'"') result+='"' ;;
			'\') result+='\' ;;
			"/") result+="/" ;;
			b) result+=$'\b' ;;
			f) result+=$'\f' ;;
			n) result+=$'\n' ;;
			r) result+=$'\r' ;;
			t) result+=$'\t' ;;
			u)
				# \u の後ろに続く4桁の16進数を取得
				if ((i + 4 >= length)); then
					# 不正な \u 形式
					return 1
				fi
				local code="${s:$i+1:4}"
				# 4桁が16進数かどうかチェック
				if [[ ! $code =~ ^[0-9A-Fa-f]{4}$ ]]; then
					return 1
				fi

				# いったん4桁の値を10進数に変換
				local high_val="$((16#${code}))"

				# サロゲートハイ (0xD800 - 0xDBFF) の範囲かどうか
				if ((high_val >= 0xD800 && high_val <= 0xDBFF)); then
					# 直後に \uDC00 - \uDFFF が続いていれば合成して1文字にする
					# 次の部分は "\uXXXX" の6文字分があるか確認
					if ((i + 1 + 4 + 2 + 4 <= length)) &&
						[[ ${s:i+1+4:2} == '\\u' ]]; then
						local low_code="${s:i+1+4+2:4}"
						if [[ $low_code =~ ^[0-9A-Fa-f]{4}$ ]]; then
							local low_val="$((16#${low_code}))"
							# サロゲートロー (0xDC00 - 0xDFFF) の範囲かどうか
							if ((low_val >= 0xDC00 && low_val <= 0xDFFF)); then
								# 合成してサロゲートペアを1つのUnicode符号点に
								local codepoint=$(((high_val - 0xD800) * 0x400 + (\
									low_val - 0xDC00) + \
									0x10000))
								# 8桁の16進数にして \UXXXXXXXX 形式で評価
								local hex_code
								builtin printf -v hex_code '%08X' "${codepoint}"
								local unicode_char
								builtin print -n -v unicode_char -- "\\U${hex_code}"
								result+="$unicode_char"

								# サロゲートロー分も含めて i を進める
								((i += 1 + 4 + 2 + 4))
								((i++))
								continue
							fi
						fi
					fi
					# ここまで来た場合は単体のサロゲートハイ。
					# JSON的には不正(ローが続かない)ですが、エラーにするか単体で出力するかは設計次第。
					# ここでは不正として扱いたいなら return 1 などにする。
					# 単体として強引にデコードするなら以下のようにする(非推奨):
					# ここでは JSON標準に従い不正として扱うケースにしておきます。
					return 1
				fi

				# 通常(非サロゲート)の \uXXXX を処理
				local hex_code
				builtin printf -v hex_code '%08X' "$high_val"
				local unicode_char
				builtin print -v unicode_char "\\U${hex_code}"
				result+="$unicode_char"

				((i += 4))
				;;
			*)
				# JSON では定義されていないエスケープシーケンスの場合はそのまま
				result+="\\$nextch"
				;;
			esac
		else
			# 通常の文字
			result+="$ch"
		fi
		((i++))
	done

	# デコード結果を出力
	builtin printf -v "$reply_var" '%s' "$result"
	return 0
}

function _denovo_unquote_array {
	local reply_var="$1"
	shift
	local json="$1"
	shift

	local -a values=()
	_denovo_query_json_parse_array values "$json"

	local -a result=()
	local unquoted_item
	for item in "${values[@]}"; do
		_denovo_unquote_json unquoted_item "$item"
		result+=("$unquoted_item")
	done

	eval "$reply_var"='("${result[@]}")'
}
