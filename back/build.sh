#!/usr/bin/env bash

# back/build.sh — executado pelo Render a cada deploy
set -o errexit  # para tudo se qualquer comando falhar

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@corefin.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
if password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print('Superusuário criado.')
else:
    print('Superusuário já existe ou senha não definida.')
"