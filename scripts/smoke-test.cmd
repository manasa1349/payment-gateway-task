@echo off
setlocal enabledelayedexpansion

REM Simple end-to-end smoke test for Windows cmd.exe (no jq dependency).
REM Uses PowerShell's Invoke-RestMethod to parse JSON reliably.
REM Assumes stack is running: docker-compose up -d

set API=http://localhost:8000/api/v1
set KEY=key_test_abc123
set SECRET=secret_test_xyz789

echo === Health ===
curl -s http://localhost:8000/health
echo.

echo === Create Order ===
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "$r=Invoke-RestMethod -Method Post -Uri '%API%/orders' -Headers @{ 'X-Api-Key'='%KEY%'; 'X-Api-Secret'='%SECRET%' } -ContentType 'application/json' -Body '{\"amount\":50000,\"currency\":\"INR\",\"receipt\":\"smoke\"}'; $r.id"`) do set ORDER_ID=%%a
echo Order: %ORDER_ID%

echo === Create Payment (idempotent) ===
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "$r=Invoke-RestMethod -Method Post -Uri '%API%/payments' -Headers @{ 'X-Api-Key'='%KEY%'; 'X-Api-Secret'='%SECRET%'; 'Idempotency-Key'='smoke_idem_1' } -ContentType 'application/json' -Body ('{\"order_id\":\"%ORDER_ID%\",\"method\":\"upi\",\"vpa\":\"user@paytm\"}'); $r.id"`) do set PAYMENT_ID=%%a
echo Payment: %PAYMENT_ID%

echo === Poll Payment Status (up to 15s) ===
set STATUS=pending
for /L %%i in (1,1,15) do (
  for /f "usebackq delims=" %%s in (`powershell -NoProfile -Command "$r=Invoke-RestMethod -Method Get -Uri '%API%/payments/%PAYMENT_ID%' -Headers @{ 'X-Api-Key'='%KEY%'; 'X-Api-Secret'='%SECRET%' }; $r.status"`) do set STATUS=%%s
  echo Attempt %%i: !STATUS!
  if /I "!STATUS!"=="success" goto done_poll
  if /I "!STATUS!"=="failed" goto done_poll
  timeout /t 1 >NUL
)
:done_poll

echo === Job Queue Status ===
curl -s http://localhost:8000/api/v1/test/jobs/status
echo.

echo === Done ===
endlocal


