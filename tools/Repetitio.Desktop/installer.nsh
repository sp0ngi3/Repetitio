!macro customCheckAppRunning
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${If} $R0 == 0
    IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 +3
      nsExec::Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --prepare-update'
      Pop $R1
    StrCpy $R2 0
    ${Do}
      ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      ${If} $R0 != 0
        ${ExitDo}
      ${EndIf}
      IntOp $R2 $R2 + 1
      ${If} $R2 < 20
        Sleep 500
        ${Continue}
      ${EndIf}
      IfSilent 0 +3
        SetErrorLevel 2
        Quit
      MessageBox MB_RETRYCANCEL|MB_ICONINFORMATION "Save your work and close Repetitio before continuing. Wait for its backup to finish, then click Retry. The installer will never force-close the app or delete your data." IDRETRY +3
        SetErrorLevel 2
        Quit
      StrCpy $R2 0
    ${Loop}
  ${EndIf}
!macroend
