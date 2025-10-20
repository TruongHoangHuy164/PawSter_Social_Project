param(
    [string]$OutputPfx = "",
    [string]$Password = "pawster-dev"
)

try {
    if (-not $OutputPfx -or $OutputPfx.Trim() -eq "") {
        $OutputPfx = Join-Path $PSScriptRoot "..\certs\dev-cert.pfx"
    }
    $OutputPfx = [System.IO.Path]::GetFullPath($OutputPfx)
    $outDir = Split-Path -Parent $OutputPfx
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }

    $secure = ConvertTo-SecureString $Password -AsPlainText -Force
    $cert = New-SelfSignedCertificate -DnsName 'localhost' -CertStoreLocation Cert:\CurrentUser\My -FriendlyName 'PawSter Dev'
    Export-PfxCertificate -Cert $cert -FilePath $OutputPfx -Password $secure -Force | Out-Null
    Write-Host "✅ PFX created at: $OutputPfx"
    exit 0
}
catch {
    Write-Error $_
    exit 1
}
