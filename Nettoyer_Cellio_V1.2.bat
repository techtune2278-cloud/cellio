@echo off
setlocal
cd /d "%~dp0"
if not exist package.json (
 echo ERREUR : placez ce fichier a la racine du projet Cellio.
 exit /b 1
)
set "CELLIO_BACKUP=%~dp0..\Cellio_anciens_fichiers_%RANDOM%"
mkdir "%CELLIO_BACKUP%" 2>nul
if not exist "%CELLIO_BACKUP%" (
 echo Impossible de creer la sauvegarde.
 exit /b 1
)
for %%F in (middleware.ts app\components\Footer.tsx app\components\Header.tsx app\components\InstallPrompt.tsx) do (
 if exist "%%F" (
  move "%%F" "%CELLIO_BACKUP%\" >nul
  if errorlevel 1 exit /b 1
 )
)
if exist "app\supabase" (
 move "app\supabase" "%CELLIO_BACKUP%\app-supabase" >nul
 if errorlevel 1 exit /b 1
)
if exist "utils\supabase" (
 move "utils\supabase" "%CELLIO_BACKUP%\utils-supabase" >nul
 if errorlevel 1 exit /b 1
)
echo Anciens fichiers deplaces dans %CELLIO_BACKUP%
echo .env.local, .git et les donnees ne sont pas modifies.
echo Lancez maintenant : npm ci puis npm run verify
endlocal
