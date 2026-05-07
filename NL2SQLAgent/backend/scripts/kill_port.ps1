# 释放指定 TCP 端口上的监听进程（开发联调用）。
#
# 说明：
# - netstat 可能对同一端口重复列出多个矛盾 PID（幽灵行），**仅作对照**。
# - 部分系统上 **Get-NetTCPConnection 单次查询的 OwningProcess 会轮询变化**；脚本会**短时间多次采样合并**后再 taskkill。
# - 若仍「找不到进程」：多为权限/会话、Http.sys、或 TCP 表异常，需**管理员**终端或重启。
#
# 用法: powershell -ExecutionPolicy Bypass -File .\scripts\kill_port.ps1 -Port 8000
#
param(
  [Parameter(Mandatory = $false)]
  [int]$Port = 8000,
  [Parameter(Mandatory = $false)]
  [int]$SampleCount = 6,
  [Parameter(Mandatory = $false)]
  [int]$SampleDelayMs = 120
)

$ErrorActionPreference = "Continue"
Write-Host "Trying to free port $Port ..."

function Test-ProcessVisible {
  param([int]$ProcessId)
  if ($ProcessId -le 0) { return $false }
  if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) { return $true }
  $cim = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
  return [bool]$cim
}

function Get-PidsFromNetTcp {
  param([int]$PortNum)
  @(
    Get-NetTCPConnection -LocalPort $PortNum -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -gt 0 } |
    Select-Object -Expand OwningProcess -Unique
  )
}

function Get-PidsMergedSample {
  param([int]$PortNum, [int]$Samples, [int]$DelayMs)
  $set = New-Object "System.Collections.Generic.HashSet[int]"
  for ($i = 0; $i -lt $Samples; $i++) {
    foreach ($p in (Get-PidsFromNetTcp -PortNum $PortNum)) {
      [void]$set.Add([int]$p)
    }
    Start-Sleep -Milliseconds $DelayMs
  }
  return @(@($set) | Sort-Object)
}

function Get-PidsFromNetstatListen {
  param([int]$PortNum)
  $all = New-Object "System.Collections.Generic.HashSet[int]"
  $out = netstat -ano 2>$null | Select-String -Pattern ":$PortNum\s" | ForEach-Object { $_.Line }
  foreach ($line in $out) {
    if ($line -match 'LISTENING\s+(\d+)\s*$') {
      [void]$all.Add([int]$Matches[1])
    }
  }
  return @(@($all) | Sort-Object)
}

function Show-Diagnosis {
  param([int]$PortNum, [string]$Hint)
  Write-Host ""
  if ($Hint) { Write-Host $Hint }
  Write-Host "----- Diagnosis -----"
  Write-Host "1) Open **Administrator** CMD/PowerShell, run: taskkill /F /T /PID <pid>"
  Write-Host "2) Http.sys URL (if any line mentions :$PortNum):"
  Write-Host "     netsh http show urlacl"
  try {
    $u = cmd /c "netsh http show urlacl" 2>$null | Select-String -SimpleMatch ":$PortNum" -ErrorAction SilentlyContinue
    if ($u) { $u | ForEach-Object { Write-Host "    $_" } } else { Write-Host "   (no urlacl line containing :$PortNum in quick scan)" }
  }
  catch { }
  Write-Host "3) WSL: wsl --shutdown   (then retry)"
  Write-Host "4) Reboot if OwningProcess keeps changing or all taskkill say process not found."
  Write-Host "5) Check TCP excluded ranges (WSL/Hyper-V can reserve a band and cause **ghost LISTEN / bogus OwningProcess**):"
  try {
    cmd /c "netsh int ipv4 show excludedportrange protocol=tcp" 2>$null
  }
  catch { }
  Write-Host "   If port $PortNum falls inside a StartPort-EndPort range, stop WSL/Hyper-V or reboot; see Microsoft docs on excludedportrange."
  Write-Host "Get-NetTCPConnection (all states on port):"
  Get-NetTCPConnection -LocalPort $PortNum -ErrorAction SilentlyContinue |
    Format-Table LocalAddress, LocalPort, State, OwningProcess, AppliedSetting -AutoSize
  $pat = ':' + [string]$PortNum
  Write-Host "netstat (reference only):"
  netstat -ano | findstr $pat
}

$first = @(Get-PidsMergedSample -PortNum $Port -Samples $SampleCount -DelayMs $SampleDelayMs)
if (-not $first) {
  Write-Host "Port $Port is free (no Listen from merged sample)."
  exit 0
}

$statN = (Get-PidsFromNetstatListen -PortNum $Port).Count
if ($statN -gt 1) {
  Write-Host ("Note: netstat shows {0} LISTEN PIDs on same port (often bogus). Merged OwningProcess from {1}x Get-NetTCPConnection sample: [{2}]" -f $statN, $SampleCount, ($first -join ", "))
}
if ($first.Count -gt 1) {
  Write-Host "WARN: multiple OwningProcess values in one sample window - OS may report inconsistent state; admin taskkill or reboot may be needed."
}

$script:failStreak = 0
for ($round = 0; $round -lt 8; $round++) {
  $pids = @(Get-PidsMergedSample -PortNum $Port -Samples $SampleCount -DelayMs $SampleDelayMs)
  if (-not $pids) {
    Write-Host "Port $Port is free."
    exit 0
  }

  Write-Host ("Round {0}: taskkill PID(s) after merge: {1}" -f ($round + 1), ($pids -join ", "))
  $anySuccess = $false

  foreach ($procId in $pids) {
    if (Test-ProcessVisible $procId) {
      Write-Host "  [visible] PID $procId"
    }
    else {
      Write-Host "  [not in Get-Process/CIM] PID $procId - still running taskkill; use Admin if access denied"
    }

    $msg = cmd /c "taskkill /F /T /PID $procId" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  taskkill OK $procId"
      $anySuccess = $true
    }
    else {
      Write-Host "  taskkill failed $procId : $msg"
    }
  }

  if ($anySuccess) {
    $script:failStreak = 0
    Start-Sleep -Milliseconds 500
    continue
  }

  $script:failStreak = 1 + ([int]$script:failStreak)
  if ($script:failStreak -ge 3) {
    $last = $pids | Select-Object -Last 1
    Show-Diagnosis -PortNum $Port -Hint ("Last merged PIDs: " + ($pids -join ", ") + " | Try Admin: taskkill /F /T /PID $last")
    Write-Host ""
    Write-Host "Dev fallback: use run_uvicorn.py --port 8001 and set VITE_API_BASE_URL=http://127.0.0.1:8001"
    exit 1
  }
  Start-Sleep -Milliseconds 400
}

Show-Diagnosis -PortNum $Port -Hint "Still blocked after retries."
Write-Host ""
Write-Host "Dev fallback: run_uvicorn.py --port 8001 ; VITE_API_BASE_URL=http://127.0.0.1:8001"
exit 1
