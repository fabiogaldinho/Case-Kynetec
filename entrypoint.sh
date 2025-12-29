#!/bin/bash
# Script de entrypoint para inicializar o Gunicorn

set -e 

echo "Iniciando Gunicorn..."

exec gunicorn --bind 0.0.0.0:8090 \
              --workers 2 \
              --timeout 120 \
              --access-logfile - \
              --error-logfile - \
              wsgi:app