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
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
name = os.environ.get('DJANGO_SUPERUSER_NAME', 'Admin')
if email and password and not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password, name=name)
    print('Superusuário criado.')
else:
    print('Superusuário já existe ou variáveis não definidas.')
"

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Populando conteúdo educacional..."
  python manage.py shell -c "exec(open('scripts/popular_conteudos.py', encoding='utf-8').read())"
  echo "==> Resetando e repopulando vídeos verificados..."
  python manage.py shell -c "exec(open('scripts/reset_videos.py', encoding='utf-8').read())"
fi