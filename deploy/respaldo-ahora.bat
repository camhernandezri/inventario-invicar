@echo off
rem Hace una copia de seguridad ahora mismo (requiere ejecutar como administrador)
schtasks /Run /TN "Invicar Respaldo"
echo Copia en proceso. Revisa la carpeta backups y logs\backup.log
pause
