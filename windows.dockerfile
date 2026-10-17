# escape=`
FROM mcr.microsoft.com/windows/servercore:ltsc2025

SHELL ["powershell", "-NoLogo", "-NoProfile", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

RUN Invoke-WebRequest -UseBasicParsing `
        -Uri 'https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-windows-amd64.zip' `
        -OutFile C:\fastfetch.zip; `
    Expand-Archive -Path C:\fastfetch.zip -DestinationPath C:\fastfetch; `
    $exe = @(Get-ChildItem C:\fastfetch -Recurse -Filter fastfetch.exe); `
    if ($exe.Count -ne 1) { throw 'Expected one Fastfetch executable' }; `
    if ($exe[0].DirectoryName -ne 'C:\fastfetch') { `
        Copy-Item -Path ($exe[0].DirectoryName + '\*') -Destination C:\fastfetch -Recurse -Force `
    }; `
    Remove-Item C:\fastfetch.zip -Force

ENTRYPOINT ["C:\\fastfetch\\fastfetch.exe"]
