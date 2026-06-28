# terax-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  if (( ${+ZDOTDIR} )); then
    _terax_restore_zdotdir="$ZDOTDIR"
  else
    unset _terax_restore_zdotdir
  fi
  _terax_user_zdotdir="${TERAX_USER_ZDOTDIR:-$HOME}"
  ZDOTDIR="$_terax_user_zdotdir"
  [ -f "$_terax_user_zdotdir/.zprofile" ] && source "$_terax_user_zdotdir/.zprofile"
  if (( ${+_terax_restore_zdotdir} )); then
    ZDOTDIR="$_terax_restore_zdotdir"
  else
    unset ZDOTDIR
  fi
  unset _terax_restore_zdotdir _terax_user_zdotdir
}
:
