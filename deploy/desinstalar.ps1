# Desinstala el sistema de inventarios de Invicar (tareas programadas y regla de firewall).
# Los datos NO se borran a menos que lo confirmes.
param([string]$Destino = 'C:\Invicar\Inventario')
$ErrorActionPreference = 'Stop'

$identidad = [Security.Principal.WindowsIdentity]::GetCurrent()
$esAdmin = (New-Object Security.Principal.WindowsPrincipal($identidad)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Destino `"$Destino`""
    exit
}

foreach ($t in @('Invicar Inventario', 'Invicar Respaldo')) {
    if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $t -Confirm:$false
        Write-Host "Tarea eliminada: $t"
    }
}
Get-NetFirewallRule -DisplayName 'Invicar Inventario' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Write-Host 'Regla de firewall eliminada.'

$resp = Read-Host "Borrar tambien TODOS los datos y copias en $Destino ? Escribe BORRAR para confirmar (Enter = conservar)"
if ($resp -ceq 'BORRAR') {
    Start-Sleep -Seconds 2
    Remove-Item -Recurse -Force $Destino
    Write-Host 'Carpeta eliminada.'
} else {
    Write-Host "Los datos se conservan en $Destino"
}
Read-Host 'Presiona Enter para cerrar'
