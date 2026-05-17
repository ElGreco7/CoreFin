#!/usr/bin/env bash

# back/build.sh — executado pelo Render a cada deploy
set -o errexit  # para tudo se qualquer comando falhar

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate