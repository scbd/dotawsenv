#!/bin/sh
# Tests for bin/dotawsenv.sh, with a stub aws CLI (test/stub/aws).
#
# Run: sh test/dotawsenv.test.sh
# TEST_SH selects the shell that runs bin/dotawsenv.sh (default: sh), e.g. TEST_SH=dash.
#
# SC2016: the child commands are single-quoted on purpose (expanded by the child shell).
# SC2163: run() exports VAR=value strings read from a list.
# shellcheck disable=SC2016,SC2163

here=$(cd "$(dirname "$0")" && pwd)
script=$here/../bin/dotawsenv.sh
stub=$here/stub
SH=${TEST_SH:-sh}

# Start from a clean environment for the variables under test.
for _n in $(env | sed -n 's/^\(DOTAWSENV_[A-Za-z0-9_]*\)=.*/\1/p'); do unset "$_n"; done
unset AWS_REGION AWS_PAGER \
  FOO BAR BAZ VAL BIN GOOD BAD

work=$(mktemp -d "${TMPDIR:-/tmp}/dotawsenv-test.XXXXXX")
trap 'rm -rf "$work"' EXIT
chmod +x "$stub/aws"

passed=0
failed=0
ok() { passed=$((passed + 1)); printf 'ok - %s\n' "$1"; }
not_ok() {
  failed=$((failed + 1))
  printf 'not ok - %s\n' "$1"
  printf '  rc=%s\n  stdout: %s\n  stderr: %s\n' "$rc" "$(cat "$t/out")" "$(cat "$t/err")"
}
# check <description> <test command...>
check() { _d=$1; shift; if "$@"; then ok "$_d"; else not_ok "$_d"; fi; }
has() { grep -q -- "$2" "$1"; }
lacks() { ! grep -q -- "$2" "$1"; }

# setup <name>: fresh test dir $t with secrets/, app/ (the working dir) and an empty stub log.
setup() {
  t=$work/$1
  mkdir -p "$t/secrets" "$t/app"
  : >"$t/log"
  STUB_LOG=$t/log
  STUB_SECRETS=$t/secrets
  export STUB_LOG STUB_SECRETS
}

# run [VAR=value...] -- <command...>: runs the wrapper from $t/app with the stub first on PATH.
# stdout -> $t/out, stderr -> $t/err, exit code -> $rc.
run() {
  _vars=
  while [ $# -gt 0 ] && [ "$1" != -- ]; do
    _vars="$_vars$1
"
    shift
  done
  shift
  (
    cd "$t/app" || exit 99
    PATH=$stub:$PATH
    export PATH
    while IFS= read -r _v; do [ -n "$_v" ] && export "$_v"; done <<EOF
$_vars
EOF
    exec "$SH" "$script" "$@"
  ) >"$t/out" 2>"$t/err"
  rc=$?
}

secret() { printf '%s' "$2" >"$t/secrets/$1.string"; }

# --- tests ---

setup no-file
run -- true
check "no .awsenv: command runs" [ "$rc" = 0 ]
check "no .awsenv: no aws call" [ ! -s "$t/log" ]

setup no-command
run --
check "no command: exit 2" [ "$rc" = 2 ]
check "no command: usage on stderr" has "$t/err" 'Usage: dotawsenv.sh'

setup missing-explicit
run DOTAWSENV_CONFIG_PATH=missing.awsenv -- sh -c 'touch ran'
check "explicit missing path: exit 1" [ "$rc" = 1 ]
check "explicit missing path: message" has "$t/err" 'dotawsenv: missing.awsenv not found'
check "explicit missing path: command not run" [ ! -e "$t/app/ran" ]

setup load
secret foo-id 'foo value'
secret bar-id 'from aws'
printf 'FOO=foo-id\nBAR=bar-id\nBAZ=bar-id\n' >"$t/app/.awsenv"
run BAR=preset BAZ= -- sh -c 'printf "%s|%s|%s" "$FOO" "$BAR" "$BAZ"'
check "load: exit 0" [ "$rc" = 0 ]
check "load: var loaded, already-set kept, empty loaded" [ "$(cat "$t/out")" = 'foo value|preset|from aws' ]
check "load: no aws call for the already-set var" [ "$(grep -c '^bar-id ' "$t/log")" = 1 ]
check "load: nothing logged on success" [ ! -s "$t/err" ]

setup config-path
secret foo-id 'custom'
mkdir -p "$t/conf"
printf 'FOO=foo-id\n' >"$t/conf/my.awsenv"
run DOTAWSENV_CONFIG_PATH="$t/conf/my.awsenv" -- sh -c 'printf "%s|%s" "$FOO" "${DOTAWSENV_CONFIG_PATH-unset}"'
check "DOTAWSENV_CONFIG_PATH: file used and var removed" [ "$(cat "$t/out")" = 'custom|unset' ]

setup exact
printf ' a "b" '"'"'c'"'"' $HOME `x` \\n \\\n\nline 3\n\n' >"$t/secrets/val-id.string"
printf 'VAL=val-id\n' >"$t/app/.awsenv"
run -- sh -c 'printf "%s" "$VAL" >../got'
check "exact: exit 0" [ "$rc" = 0 ]
check "exact: spaces, quotes, \$, backslashes, newlines kept" cmp -s "$t/got" "$t/secrets/val-id.string"

setup binary
printf 'bin\001\002\377data\n\n' >"$t/secrets/bin-id.binary"
printf 'BIN=bin-id\n' >"$t/app/.awsenv"
run -- sh -c 'printf "%s" "$BIN" >../got'
check "binary: exit 0" [ "$rc" = 0 ]
check "binary: SecretBinary decoded" cmp -s "$t/got" "$t/secrets/bin-id.binary"
check "binary: SecretString tried first" has "$t/log" '^bin-id SecretString '

setup fail
secret good-id 's3cr3t-value'
printf 'GOOD=good-id\nBAD=fail-missing\n' >"$t/app/.awsenv"
run -- sh -c 'touch ran'
check "failing secret: exit 1" [ "$rc" = 1 ]
check "failing secret: message names var and id" has "$t/err" '^dotawsenv: BAD (fail-missing): An error occurred (ResourceNotFoundException)'
check "failing secret: no value in message" lacks "$t/err" 's3cr3t'
check "failing secret: command not run" [ ! -e "$t/app/ran" ]

setup credentials
secret foo-id 'x'
printf 'FOO=foo-id\n' >"$t/app/.awsenv"
run AWS_REGION=app-region -- env
check "aws uses the app AWS_* and no pager" has "$t/log" '^foo-id SecretString AWS_REGION=app-region AWS_PAGER=$'
check "app AWS_* unchanged" has "$t/out" '^AWS_REGION=app-region$'
check "no AWS_PAGER in the command env" lacks "$t/out" '^AWS_PAGER='

setup invalid-name
printf 'FOO=foo-id\nBAD-NAME=bar-id\n' >"$t/app/.awsenv"
run -- sh -c 'touch ran'
check "invalid name: exit 1" [ "$rc" = 1 ]
check "invalid name: message with line" has "$t/err" "\.awsenv:2: invalid name 'BAD-NAME'"
check "invalid name: no aws call" [ ! -s "$t/log" ]
check "invalid name: command not run" [ ! -e "$t/app/ran" ]

setup leading-digit
printf '1FOO=foo-id\n' >"$t/app/.awsenv"
run -- true
check "name starting with a digit: exit 1" [ "$rc" = 1 ]

setup no-equals
printf 'FOO\n' >"$t/app/.awsenv"
run -- true
check "line without =: exit 1" [ "$rc" = 1 ]
check "line without =: message" has "$t/err" 'expected NAME=<secret id>'

setup parsing
secret a 'A'
secret b 'B'
secret c 'C'
secret d 'D'
secret e 'E'
printf '# comment\n\n  # indented comment\nexport FOO=a\nBAR = "b"\r\nBAZ='"'"'c'"'"'\n  VAL=d  \nGOOD=e' >"$t/app/.awsenv"
run -- sh -c 'printf "%s|%s|%s|%s|%s" "$FOO" "$BAR" "$BAZ" "$VAL" "$GOOD"'
check "parsing: comments, export, quotes, spaces, CRLF, no final newline" [ "$(cat "$t/out")" = 'A|B|C|D|E' ]

setup duplicate
secret a 'first'
secret b 'second'
printf 'FOO=a\nFOO=b\n' >"$t/app/.awsenv"
run -- sh -c 'printf "%s" "$FOO"'
check "duplicate name: last one wins (like dotenv)" [ "$(cat "$t/out")" = 'second' ]

setup exec
run -- sh -c 'printf "%s|" "$@"; exit 7' child 'a b' '' 'c*'
check "exec: args passed through" [ "$(cat "$t/out")" = 'a b||c*|' ]
check "exec: exit code passed through" [ "$rc" = 7 ]

setup no-aws
printf 'FOO=foo-id\n' >"$t/app/.awsenv"
if PATH=/usr/bin:/bin command -v aws >/dev/null 2>&1; then
  printf 'ok - aws missing: # SKIP aws is in /usr/bin or /bin\n'
else
  (cd "$t/app" && PATH=/usr/bin:/bin "$SH" "$script" true) >"$t/out" 2>"$t/err"
  rc=$?
  check "aws missing: exit 1" [ "$rc" = 1 ]
  check "aws missing: message" has "$t/err" 'aws CLI not found'
fi

printf '\n%s passed, %s failed (shell: %s)\n' "$passed" "$failed" "$SH"
[ "$failed" = 0 ]
