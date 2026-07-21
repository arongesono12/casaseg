[CmdletBinding(DefaultParameterSetName = 'Sql')]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true, ParameterSetName = 'Sql')]
  [string]$Sql,

  [Parameter(Mandatory = $true, ParameterSetName = 'File')]
  [string]$SqlFile,

  [Parameter(Mandatory = $true, ParameterSetName = 'SecurityAdvisors')]
  [switch]$SecurityAdvisors,

  [Parameter(ParameterSetName = 'SecurityAdvisors')]
  [switch]$Summary,

  [Parameter(ParameterSetName = 'SecurityAdvisors')]
  [switch]$CountsOnly,

  [Parameter(Mandatory = $true, ParameterSetName = 'EnableLeakedPasswordProtection')]
  [switch]$EnableLeakedPasswordProtection,

  [switch]$ReadOnly
)

$ErrorActionPreference = 'Stop'

if (-not ('CasaSeg.NativeCredential' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace CasaSeg {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct Credential {
    public UInt32 Flags;
    public UInt32 Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }

  public static class NativeCredential {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool Read(string target, UInt32 type, UInt32 flags, out IntPtr credential);

    [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void Free(IntPtr credential);
  }
}
'@
}

$credentialPointer = [IntPtr]::Zero
$credentialTarget = 'Supabase CLI:supabase'
if (-not [CasaSeg.NativeCredential]::Read($credentialTarget, 1, 0, [ref]$credentialPointer)) {
  throw "No se pudo leer la sesión de Supabase CLI desde Windows Credential Manager."
}

try {
  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
    $credentialPointer,
    [type][CasaSeg.Credential]
  )
  $tokenBytes = New-Object byte[] $credential.CredentialBlobSize
  [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $tokenBytes, 0, $tokenBytes.Length)
  $accessToken = [Text.Encoding]::UTF8.GetString($tokenBytes).Trim([char]0)
} finally {
  [CasaSeg.NativeCredential]::Free($credentialPointer)
}

if ([string]::IsNullOrWhiteSpace($accessToken)) {
  throw 'La sesión de Supabase CLI no contiene un token válido.'
}

$query = if ($PSCmdlet.ParameterSetName -eq 'File') {
  $resolvedSqlPath = (Resolve-Path -LiteralPath $SqlFile).Path
  [IO.File]::ReadAllText($resolvedSqlPath)
} elseif ($PSCmdlet.ParameterSetName -eq 'Sql') {
  [string]$Sql
}

$headers = @{
  Authorization = "Bearer $accessToken"
  Accept = 'application/json'
}

try {
  if ($SecurityAdvisors) {
    $response = Invoke-WebRequest `
      -UseBasicParsing `
      -Method Get `
      -Uri "https://api.supabase.com/v1/projects/$ProjectRef/advisors/security" `
      -Headers $headers
  } elseif ($EnableLeakedPasswordProtection) {
    $authConfigBody = @{ password_hibp_enabled = $true } | ConvertTo-Json -Compress
    $response = Invoke-WebRequest `
      -UseBasicParsing `
      -Method Patch `
      -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
      -Headers $headers `
      -ContentType 'application/json' `
      -Body $authConfigBody
  } else {
    $requestBody = @{
      query = $query
      read_only = [bool]$ReadOnly
    } | ConvertTo-Json -Depth 4
    $response = Invoke-WebRequest `
      -UseBasicParsing `
      -Method Post `
      -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
      -Headers $headers `
      -ContentType 'application/json' `
      -Body $requestBody
  }
  if ($EnableLeakedPasswordProtection) {
    $authConfigResponse = $response.Content | ConvertFrom-Json
    [pscustomobject]@{
      password_hibp_enabled = [bool]$authConfigResponse.password_hibp_enabled
    } | ConvertTo-Json -Compress
  } elseif ($SecurityAdvisors -and $Summary) {
    $advisorResponse = $response.Content | ConvertFrom-Json
    $warnings = @($advisorResponse.lints | Where-Object { $_.level -eq 'WARN' })
    $groups = @($warnings | Group-Object name | Sort-Object Name | ForEach-Object {
      [pscustomobject]@{
        name = $_.Name
        count = $_.Count
        entities = @($_.Group | ForEach-Object {
          [pscustomobject]@{
            schema = $_.metadata.schema
            name = $_.metadata.name
            arguments = $_.metadata.arguments
            type = $_.metadata.type
            detail = $_.detail
          }
        })
      }
    })
    if ($CountsOnly) {
      [pscustomobject]@{
        warning_count = $warnings.Count
        groups = @($groups | Select-Object name, count)
      } | ConvertTo-Json -Depth 4 -Compress
    } else {
      [pscustomobject]@{
        warning_count = $warnings.Count
        groups = $groups
      } | ConvertTo-Json -Depth 8 -Compress
    }
  } else {
    Write-Output $response.Content
  }
} catch {
  $errorBody = $_.ErrorDetails.Message
  $errorResponse = $_.Exception.Response
  if ([string]::IsNullOrWhiteSpace($errorBody) -and $errorResponse) {
    $reader = New-Object IO.StreamReader($errorResponse.GetResponseStream())
    try { $errorBody = $reader.ReadToEnd() } finally { $reader.Dispose() }
  }
  $statusCode = if ($errorResponse) { [int]$errorResponse.StatusCode } else { 0 }
  throw "Supabase Management API devolvió HTTP $statusCode. $errorBody"
} finally {
  $accessToken = $null
  [Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
}
