$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("C:\\Users\\prans\\Desktop\\start-react-app-shortcut.lnk")
$Shortcut.TargetPath = "C:\\Users\\prans\\Desktop\\start-react-app.bat"
$Shortcut.Save()
