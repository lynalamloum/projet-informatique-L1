@echo off
setlocal enabledelayedexpansion
title MindChallenger
color 0A
cls
echo.
echo  ================================================
echo   MINDCHALLENGER
echo  ================================================
echo.

:: Verifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
  echo  [ERREUR] Node.js n'est pas installe.
  echo  Telecharge-le sur : https://nodejs.org
  echo  puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

:: Verifier si une cle Anthropic existe deja dans .env.local
set ANTHROPIC_KEY=
if exist ".env.local" (
  for /f "tokens=2 delims==" %%a in ('findstr "ANTHROPIC_API_KEY" .env.local 2^>nul') do set ANTHROPIC_KEY=%%a
)

:: Si pas de cle, demander a l'utilisateur
if "!ANTHROPIC_KEY!"=="" (
  echo  Aucune cle API detectee.
  echo.
  echo  Obtiens une cle sur : https://console.anthropic.com
  echo  Elle commence par : sk-ant-...
  echo.
  set /p ANTHROPIC_KEY="  Colle ta cle Anthropic ici et appuie sur Entree : "
  echo.
  if "!ANTHROPIC_KEY!"=="" (
    echo  Aucune cle saisie. Lancement sans IA.
  ) else (
    echo AI_PROVIDER=anthropic> .env.local
    echo ANTHROPIC_API_KEY=!ANTHROPIC_KEY!>> .env.local
    echo ANTHROPIC_MODEL=claude-sonnet-4-5>> .env.local
    echo  Cle sauvegardee ^!
  )
) else (
  echo  Cle API detectee.
)

echo.
echo  Lancement du serveur...
start /B node server.js

echo  Attente du demarrage...
timeout /t 2 /nobreak >nul

echo  Ouverture dans le navigateur...
start http://localhost:5173

echo.
echo  MindChallenger est ouvert dans ton navigateur.
echo  Laisse cette fenetre ouverte. Ferme-la pour arreter.
echo.
pause >nul
