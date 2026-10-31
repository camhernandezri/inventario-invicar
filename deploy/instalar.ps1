# ============================================================================
#  Instalador del sistema de inventarios de Invicar  (Windows 10 / 11)
#  Uso: clic derecho sobre este archivo -> "Ejecutar con PowerShell"
#       (pedira permisos de administrador por si solo)
# ============================================================================
param(
    [string]$Destino = 'C:\Invicar\Inventario',
    [int]$Puerto = 3000
)
$ErrorActionPreference = 'Stop'

function Titulo($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "  [OK] $t" -ForegroundColor Green }
function Aviso($t)  { Write-Host "  [!]  $t" -ForegroundColor Yellow }
function Salir($t)  { Write-Host ''; Write-Host $t -ForegroundColor Red; Read-Host 'Presiona Enter para cerrar'; exit 1 }

# --- Permisos de administrador (se vuelve a abrir solo, elevado) ---
$identidad = [Security.Principal.WindowsIdentity]::GetCurrent()
$esAdmin = (New-Object Security.Principal.WindowsPrincipal($identidad)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host 'Se necesitan permisos de administrador. Aparecera una ventana de confirmacion de Windows...'
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Destino `"$Destino`" -Puerto $Puerto"
    exit
}

try {
    $origen = $PSScriptRoot
    $tarea = 'Invicar Inventario'
    $tareaCopia = 'Invicar Respaldo'

    # ---------------------------------------------------------------- Node
    Titulo '1. Buscando Node.js'
    $nodePortable = Join-Path $origen 'node\node.exe'
    $usaPortable = Test-Path $nodePortable
    if ($usaPortable) {
        $nodeExe = $nodePortable
    } else {
        $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $cmd) {
            Salir 'No se encontro Node.js. Instala Node.js LTS (version 22.13 o superior) desde https://nodejs.org y vuelve a ejecutar este instalador. (Alternativa: copia la version portable de Node en una carpeta "node" junto a este archivo.)'
        }
        $nodeExe = $cmd.Source
    }
    $version = (& $nodeExe -v).Trim().TrimStart('v')
    if ([version]$version -lt [version]'22.13.0') {
        Salir "Node.js $version es demasiado antiguo. Instala Node.js LTS (22.13 o superior) desde https://nodejs.org"
    }
    Ok "Node.js $version"

    # --------------------------------------------------- Detener si ya existe
    Titulo '2. Copiando archivos'
    if (Get-ScheduledTask -TaskName $tarea -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask -TaskName $tarea -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Aviso 'Se detuvo la version instalada anteriormente (los datos se conservan).'
    }
    foreach ($d in @($Destino, "$Destino\data", "$Destino\backups", "$Destino\logs")) {
        New-Item -ItemType Directory -Force -Path $d | Out-Null
    }
    function Copiar($de, $a) {
        robocopy $de $a /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "No se pudo copiar $de" }
    }
    Copiar "$origen\app" "$Destino\app"
    Copiar "$origen\core" "$Destino\core"
    Copiar "$origen\scripts" "$Destino\scripts"
    if ($usaPortable) {
        Copiar "$origen\node" "$Destino\node"
        $nodeExe = "$Destino\node\node.exe"
    }
    Get-ChildItem "$origen\*.bat" | Copy-Item -Destination $Destino -Force
    Ok "Archivos en $Destino"

    # ------------------------------------------------------------ Arranque
    $run = @"
@echo off
set NODE_ENV=production
set PORT=$Puerto
set HOSTNAME=0.0.0.0
set DATABASE_PATH=$Destino\data\inventario.db
cd /d "$Destino\app"
"$nodeExe" --disable-warning=ExperimentalWarning server.js >> "$Destino\logs\servidor.log" 2>&1
"@
    Set-Content -Path "$Destino\run-server.cmd" -Value $run -Encoding ASCII

    # ------------------------------------------------------------- Usuarios
    Titulo '3. Usuarios del sistema'
    $rutaDb = "$Destino\data\inventario.db"
    $env:DATABASE_PATH = $rutaDb
    function LeerClave($quien) {
        while ($true) {
            $a = Read-Host "Contrasena para $quien (minimo 8 caracteres)" -AsSecureString
            $b = Read-Host 'Repite la contrasena' -AsSecureString
            $pa = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a))
            $pb = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($b))
            if ($pa -ne $pb) { Aviso 'Las contrasenas no coinciden. Intenta de nuevo.'; continue }
            if ($pa.Length -lt 8) { Aviso 'Debe tener al menos 8 caracteres.'; continue }
            return $pa
        }
    }
    if (Test-Path $rutaDb) {
        Ok 'Ya existe una base de datos: se conserva tal cual (usuarios y datos).'
    } else {
        Write-Host '  Se crean dos usuarios: "encargado" (puede editar) y "secretaria" (solo lectura).'
        $env:ADMIN_PASSWORD = LeerClave 'el ENCARGADO (usuario: encargado)'
        $env:CONSULTA_PASSWORD = LeerClave 'la SECRETARIA (usuario: secretaria)'
        $demo = Read-Host 'Cargar materiales y kits de EJEMPLO para probar? (s/N)'
        $args2 = @("$Destino\scripts\seed.mjs")
        if ($demo -match '^[sSyY]') { $args2 += '--demo' }
        & $nodeExe --disable-warning=ExperimentalWarning @args2
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron crear los usuarios.' }
        Remove-Item Env:ADMIN_PASSWORD, Env:CONSULTA_PASSWORD -ErrorAction SilentlyContinue
        Ok 'Usuarios creados.'
    }

    # ------------------------------------------------------- Copias de seguridad
    Titulo '4. Copias de seguridad'
    Write-Host '  Siempre se guarda una copia en:' "$Destino\backups"
    Write-Host '  Ademas conviene una copia FUERA de este PC (disco externo o carpeta compartida del PC del encargado).'
    $extra = Read-Host '  Ruta adicional (ej. E:\Respaldos  o  \\PC-ENCARGADO\Respaldos). Enter para omitir'
    $extra = $extra.Trim()
    $credencial = $null
    if ($extra -like '\\*') {
        Aviso 'Las carpetas de red necesitan una cuenta de Windows con permiso de escritura en esa carpeta.'
        $credencial = Get-Credential -Message 'Cuenta de Windows con acceso a la carpeta de red (ej. PC-ENCARGADO\encargado)'
    }
    $copia = @"
@echo off
set DATABASE_PATH=$Destino\data\inventario.db
set BACKUP_DIRS=$extra
"$nodeExe" --disable-warning=ExperimentalWarning "$Destino\scripts\backup.mjs"
"@
    Set-Content -Path "$Destino\run-backup.cmd" -Value $copia -Encoding ASCII

    # ---------------------------------------------------------- Permisos de carpeta
    Titulo '5. Seguridad'
    # Solo el sistema y los administradores pueden tocar la base de datos: un usuario estandar de Windows no.
    icacls $Destino /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
    if ($credencial) { icacls $Destino /grant "$($credencial.UserName):(OI)(CI)M" | Out-Null }
    Ok 'Carpeta protegida (solo administradores).'
    Get-NetFirewallRule -DisplayName $tarea -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName $tarea -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Puerto -RemoteAddress LocalSubnet -Profile Any | Out-Null
    Ok "Firewall: puerto $Puerto abierto solo para la red local."

    # ---------------------------------------------------------------- Tareas
    Titulo '6. Programando el arranque automatico'
    $accion = New-ScheduledTaskAction -Execute "$Destino\run-server.cmd"
    $alIniciar = New-ScheduledTaskTrigger -AtStartup
    $sistema = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $config = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $tarea -Action $accion -Trigger $alIniciar -Principal $sistema -Settings $config -Force | Out-Null
    Ok 'El sistema arrancara solo cada vez que se encienda este PC.'

    $accionCopia = New-ScheduledTaskAction -Execute "$Destino\run-backup.cmd"
    $disparadores = @((New-ScheduledTaskTrigger -Daily -At '10:30'), (New-ScheduledTaskTrigger -Daily -At '16:00'))
    $configCopia = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
    if ($credencial) {
        Register-ScheduledTask -TaskName $tareaCopia -Action $accionCopia -Trigger $disparadores -Settings $configCopia `
            -User $credencial.UserName -Password $credencial.GetNetworkCredential().Password -RunLevel Highest -Force | Out-Null
    } else {
        Register-ScheduledTask -TaskName $tareaCopia -Action $accionCopia -Trigger $disparadores -Principal $sistema -Settings $configCopia -Force | Out-Null
    }
    Ok 'Copias automaticas a las 10:30 y a las 16:00 (si el PC estaba apagado, se hacen al encenderlo).'

    # ---------------------------------------------------------------- Arranque
    Titulo '7. Iniciando'
    Start-ScheduledTask -TaskName $tarea
    $responde = $false
    for ($i = 0; $i -lt 15 -and -not $responde; $i++) {
        Start-Sleep -Seconds 2
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$Puerto/login" -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { $responde = $true }
        } catch { }
    }
    if ($responde) { Ok 'El sistema esta funcionando.' } else { Aviso "No respondio todavia. Revisa $Destino\logs\servidor.log" }

    Write-Host ''
    Write-Host '===========================================================' -ForegroundColor Green
    Write-Host '  Instalacion terminada. Abre en el navegador (desde cualquier' -ForegroundColor Green
    Write-Host '  PC de la red de la oficina):' -ForegroundColor Green
    $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' }
    foreach ($ip in $ips) { Write-Host "      http://$($ip.IPAddress):$Puerto" -ForegroundColor White }
    Write-Host '  IMPORTANTE: reserva esa IP en el router para que no cambie.' -ForegroundColor Green
    Write-Host '===========================================================' -ForegroundColor Green
    Read-Host 'Presiona Enter para cerrar'
} catch {
    Salir "Ocurrio un error: $($_.Exception.Message)"
}
