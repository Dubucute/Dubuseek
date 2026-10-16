Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr "":8080"" ^| findstr ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True
WScript.Sleep 1000
WshShell.Run "cmd /c set PORT=8080&& set DUBUSEEK_API_KEY=sk-dubuseek&& set DUBUSEEK_TOOL_REASONING=clean&& node dist/index.js start", 0, False
