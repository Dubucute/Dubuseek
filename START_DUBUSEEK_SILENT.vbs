Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c set PORT=8080&& set DUBUSEEK_API_KEY=sk-dubuseek&& node dist/index.js start", 0, False
