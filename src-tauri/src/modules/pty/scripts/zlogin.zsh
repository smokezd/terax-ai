# terax-shell-integration (zlogin)
#
# This is the LAST init file zsh runs before entering the prompt loop, so its
# exit status becomes `$?` for the very first prompt. Without the trailing `:`,
# users without a personal ~/.zlogin (the common case) hit a non-zero $? on
# first render — themes that condition prompt color on `%?` (robbyrussell etc.)
# show a red error indicator on a clean shell start.
{
  if (( ${+ZDOTDIR} )); then
    _terax_restore_zdotdir="$ZDOTDIR"
  else
    unset _terax_restore_zdotdir
  fi
  _terax_user_zdotdir="${TERAX_USER_ZDOTDIR:-$HOME}"
  ZDOTDIR="$_terax_user_zdotdir"
  [ -f "$_terax_user_zdotdir/.zlogin" ] && source "$_terax_user_zdotdir/.zlogin"
  if (( ${+_terax_restore_zdotdir} )); then
    ZDOTDIR="$_terax_restore_zdotdir"
  else
    unset ZDOTDIR
  fi
  unset _terax_restore_zdotdir _terax_user_zdotdir
}
:
