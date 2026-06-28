# terax-shell-integration (zshenv)
#
# Trailing `:` is load-bearing — without it, a missing user .zshenv leaves $?=1,
# which propagates through the rest of init and ultimately into the first
# prompt's `%?` (rendering robbyrussell's `➜` red on a clean shell start).
{
  if (( ${+ZDOTDIR} )); then
    _terax_restore_zdotdir="$ZDOTDIR"
  else
    unset _terax_restore_zdotdir
  fi
  _terax_user_zdotdir="${TERAX_USER_ZDOTDIR:-$HOME}"
  ZDOTDIR="$_terax_user_zdotdir"
  [ -f "$_terax_user_zdotdir/.zshenv" ] && source "$_terax_user_zdotdir/.zshenv"
  if (( ${+_terax_restore_zdotdir} )); then
    ZDOTDIR="$_terax_restore_zdotdir"
  else
    unset ZDOTDIR
  fi
  unset _terax_restore_zdotdir _terax_user_zdotdir
}
:
