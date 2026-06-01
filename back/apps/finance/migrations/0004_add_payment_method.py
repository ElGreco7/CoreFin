# back/apps/finance/migrations/0004_add_payment_method.py
#
# Adiciona o campo payment_method em Income e Expense.
# Usa blank=True + default='dinheiro' para não quebrar registros existentes.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_alter_category_unique_together_alter_category_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='income',
            name='payment_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('dinheiro', 'Dinheiro'),
                    ('pix',      'PIX'),
                    ('credito',  'Crédito'),
                    ('debito',   'Débito'),
                ],
                default='dinheiro',
                blank=True,
                verbose_name='Forma de pagamento',
            ),
        ),
        migrations.AddField(
            model_name='expense',
            name='payment_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('dinheiro', 'Dinheiro'),
                    ('pix',      'PIX'),
                    ('credito',  'Crédito'),
                    ('debito',   'Débito'),
                ],
                default='dinheiro',
                blank=True,
                verbose_name='Forma de pagamento',
            ),
        ),
    ]
