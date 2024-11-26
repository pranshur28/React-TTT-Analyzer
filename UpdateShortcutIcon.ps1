$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("C:\\Users\\prans\\Desktop\\start-react-app-shortcut.lnk")
$Shortcut.TargetPath = "C:\\Users\\prans\\Desktop\\start-react-app.bat"
$Shortcut.IconLocation = "C:\\Windows\\System32\\shell32.dll,1"  # Using a default Windows icon
$Shortcut.Save()
