#!/bin/sh
# dotawsenv.sh - load secrets from AWS Secrets Manager into the environment, then run a command.
#
# Usage: dotawsenv.sh <command> [args...]
#
# Reads .awsenv (NAME=<secret name or ARN> lines). For each NAME that is not already set to a
# non-empty value, loads the secret (SecretString, or SecretBinary decoded) into NAME, then
# exec's the command. Any error stops the script with exit 1 before the command runs.
#
# Option (environment), removed from the command's environment:
#   DOTAWSENV_CONFIG_PATH  the .awsenv file (default ./.awsenv; a missing default file is skipped)
# The aws CLI uses the default credential chain, the same as the app.
#
# https://github.com/scbd/dotawsenv
#
# Internal variables use the _da_ prefix so they don't clash with the app's own variables,
# which are passed to the command unchanged.

_da_nl='
'
_da_cr=$(printf '\r')
_da_tmp=

_da_usage() {
  cat >&2 <<'EOF'
Usage: dotawsenv.sh <command> [args...]

Loads the secrets listed in .awsenv (NAME=<secret name or ARN>) from AWS Secrets
Manager into the environment, then runs <command>. Variables that are already set
to a non-empty value are kept.

Environment:
  DOTAWSENV_CONFIG_PATH  the .awsenv file (default: ./.awsenv)
EOF
}

_da_die() {
  printf 'dotawsenv: %s\n' "$1" >&2
  [ -n "$_da_tmp" ] && rm -rf "$_da_tmp"
  exit 1
}

# True when $1 is a valid environment variable name.
_da_is_name() {
  case $1 in
    '' | [0-9]* | *[!A-Za-z0-9_]*) return 1 ;;
    *) return 0 ;;
  esac
}

# aws secretsmanager get-secret-value for secret $1, query $2. Output in $_da_tmp/out and /err.
_da_aws() {
  AWS_PAGER= aws secretsmanager get-secret-value --secret-id "$1" --query "$2" --output text \
    >"$_da_tmp/out" 2>"$_da_tmp/err"
}

# Sets _da_out to the content of $_da_tmp/out, minus the one newline the text output adds.
_da_read_out() {
  _da_out=$(cat "$_da_tmp/out"; printf x)
  _da_out=${_da_out%x}
  _da_out=${_da_out%"$_da_nl"}
}

# Fails with prefix $1 and the aws error message. Never prints a value.
_da_fail() {
  _da_msg=$(sed '/^[[:space:]]*$/d' "$_da_tmp/err" | tr '\n' ' ')
  _da_msg=${_da_msg% }
  _da_die "$1: ${_da_msg:-aws call failed}"
}

[ $# -gt 0 ] || { _da_usage; exit 2; }

if [ -n "${DOTAWSENV_CONFIG_PATH+x}" ]; then
  _da_config=$DOTAWSENV_CONFIG_PATH
  _da_explicit=1
else
  _da_config=./.awsenv
  _da_explicit=
fi

# Parse the whole file first, so a syntax error fails before any AWS call.
# _da_entries holds one NAME=<secret id> line per secret to load.
_da_entries=
if [ -e "$_da_config" ]; then
  [ -f "$_da_config" ] && [ -r "$_da_config" ] || _da_die "$_da_config: not a readable file"
  _da_lineno=0
  while IFS= read -r _da_line || [ -n "$_da_line" ]; do
    _da_lineno=$((_da_lineno + 1))
    _da_line=${_da_line%"$_da_cr"}
    _da_line=${_da_line#"${_da_line%%[![:space:]]*}"}
    case $_da_line in '' | '#'*) continue ;; esac
    case $_da_line in
      export[[:space:]]*)
        _da_line=${_da_line#export}
        _da_line=${_da_line#"${_da_line%%[![:space:]]*}"}
        ;;
    esac
    case $_da_line in
      *=*) ;;
      *) _da_die "$_da_config:$_da_lineno: expected NAME=<secret id>" ;;
    esac
    _da_name=${_da_line%%=*}
    _da_name=${_da_name%"${_da_name##*[![:space:]]}"}
    _da_id=${_da_line#*=}
    _da_id=${_da_id#"${_da_id%%[![:space:]]*}"}
    _da_id=${_da_id%"${_da_id##*[![:space:]]}"}
    case $_da_id in
      \"*\") _da_id=${_da_id#\"}; _da_id=${_da_id%\"} ;;
      \'*\') _da_id=${_da_id#\'}; _da_id=${_da_id%\'} ;;
    esac
    _da_is_name "$_da_name" || _da_die "$_da_config:$_da_lineno: invalid name '$_da_name'"
    [ -n "$_da_id" ] || _da_die "$_da_config:$_da_lineno: $_da_name: empty secret id"
    # Already set (non-empty) wins.
    eval "_da_cur=\${$_da_name-}"
    [ -n "$_da_cur" ] && continue
    _da_entries=$_da_entries$_da_name=$_da_id$_da_nl
  done <"$_da_config"
elif [ -n "$_da_explicit" ]; then
  _da_die "$_da_config not found"
fi

# Fetch every secret into a file before exporting anything (fail fast, all or nothing).
_da_count=0
if [ -n "$_da_entries" ]; then
  command -v aws >/dev/null 2>&1 || _da_die "aws CLI not found (needed to load $_da_config)"
  _da_tmp=$(mktemp -d "${TMPDIR:-/tmp}/dotawsenv.XXXXXX") || _da_die "cannot create a temporary directory"
  chmod 700 "$_da_tmp"
  while IFS= read -r _da_e; do
    [ -n "$_da_e" ] || continue
    _da_name=${_da_e%%=*}
    _da_id=${_da_e#*=}
    _da_count=$((_da_count + 1))
    _da_aws "$_da_id" SecretString || _da_fail "$_da_name ($_da_id)"
    _da_read_out
    if [ "$_da_out" = None ]; then
      # No SecretString: use SecretBinary (base64 in the CLI output), if there is one.
      _da_aws "$_da_id" SecretBinary || _da_fail "$_da_name ($_da_id)"
      _da_read_out
      if [ "$_da_out" != None ]; then
        base64 -d <"$_da_tmp/out" >"$_da_tmp/$_da_count" 2>"$_da_tmp/err" || _da_fail "$_da_name ($_da_id)"
        continue
      fi
    fi
    printf '%s' "$_da_out" >"$_da_tmp/$_da_count"
  done <<EOF
$_da_entries
EOF
fi

unset DOTAWSENV_CONFIG_PATH

if [ "$_da_count" -gt 0 ]; then
  _da_cat=$(command -v cat)
  _da_rm=$(command -v rm)
  _da_i=0
  while IFS= read -r _da_e; do
    [ -n "$_da_e" ] || continue
    _da_i=$((_da_i + 1))
    _da_v=$("$_da_cat" "$_da_tmp/$_da_i"; printf x)
    export "${_da_e%%=*}=${_da_v%x}"
  done <<EOF
$_da_entries
EOF
  "$_da_rm" -rf "$_da_tmp"
fi

exec "$@"
