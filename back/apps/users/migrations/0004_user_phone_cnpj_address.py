# Generated manually for adding phone, cnpj and address fields to User
# Você também pode regerar este arquivo com:  python manage.py makemigrations users

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_business_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='phone',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Telefone de contato do usuário.',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='cnpj',
            field=models.CharField(
                blank=True,
                default='',
                help_text='CNPJ do MEI (apenas dígitos ou formatado).',
                max_length=18,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='address',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Endereço completo do usuário/empresa.',
                max_length=255,
            ),
        ),
    ]
