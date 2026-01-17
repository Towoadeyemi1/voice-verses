; Cornerstone Speech Service - NSIS Installer Script

!include "MUI2.nsh"

Name "Cornerstone Speech Service"
OutFile "..\service\dist\CornerstoneSpeechServiceSetup.exe"
InstallDir "$PROGRAMFILES\Cornerstone Speech Service"
RequestExecutionLevel admin

; UI settings
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath $INSTDIR
    
    ; Copy application files
    File /r "..\service\dist\CornerstoneSpeechService\*.*"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Create Start Menu shortcuts
    CreateDirectory "$SMPROGRAMS\Cornerstone Speech Service"
    CreateShortcut "$SMPROGRAMS\Cornerstone Speech Service\Cornerstone Speech Service.lnk" "$INSTDIR\CornerstoneSpeechService.exe"
    CreateShortcut "$SMPROGRAMS\Cornerstone Speech Service\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Add to startup (optional)
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CornerstoneSpeechService" "$INSTDIR\CornerstoneSpeechService.exe"
    
    ; Add/Remove Programs entry
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CornerstoneSpeechService" "DisplayName" "Cornerstone Speech Service"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CornerstoneSpeechService" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CornerstoneSpeechService" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CornerstoneSpeechService" "Publisher" "Cornerstone Church"
SectionEnd

Section "Uninstall"
    ; Remove startup entry
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CornerstoneSpeechService"
    
    ; Remove Add/Remove Programs entry
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CornerstoneSpeechService"
    
    ; Remove shortcuts
    RMDir /r "$SMPROGRAMS\Cornerstone Speech Service"
    
    ; Remove application files
    RMDir /r "$INSTDIR"
SectionEnd
