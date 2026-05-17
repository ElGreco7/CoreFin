"""
apps/analytics/signals.py
Grava eventos automaticamente quando coisas acontecem no banco.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from apps.goals.models import Goal, Contribution
from apps.finance.models import Income, Expense, Category
from apps.notifications.models import Notification

from .models import Event


User = get_user_model()


# ── Helpers ─────────────────────────────────────────────────────────────────

def _log(user, event_type, category, related_obj=None, props=None):
    """Cria um Event de forma rápida."""
    if user is None or not getattr(user, "is_authenticated", True):
        return

    related_type = related_obj._meta.model_name if related_obj else ""
    related_id = related_obj.pk if related_obj else None

    Event.objects.create(
        user=user if hasattr(user, "pk") else None,
        event_type=event_type,
        category=category,
        related_type=related_type,
        related_id=related_id,
        properties=props or {},
    )


# ── Login / Logout ──────────────────────────────────────────────────────────

@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    _log(user, "login", "auth")


@receiver(user_logged_out)
def on_logout(sender, request, user, **kwargs):
    _log(user, "logout", "auth")


# ── Metas ───────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Goal)
def on_goal_save(sender, instance, created, **kwargs):
    if created:
        _log(instance.user, "goal_created", "goals", instance,
             props={"name": instance.name, "target": float(instance.target_amount)})
    elif instance.status == Goal.Status.COMPLETED:
        # Só loga "completed" quando o status MUDA pra completed
        # (pra não logar toda vez que atualizar algo na meta concluída)
        _log(instance.user, "goal_completed", "goals", instance,
             props={"name": instance.name})


@receiver(post_delete, sender=Goal)
def on_goal_delete(sender, instance, **kwargs):
    _log(instance.user, "goal_deleted", "goals", instance,
         props={"name": instance.name})


@receiver(post_save, sender=Contribution)
def on_contribution_save(sender, instance, created, **kwargs):
    if created:
        _log(instance.user, "goal_contribution", "goals", instance.goal,
             props={
                 "goal_name": instance.goal.name,
                 "amount": float(instance.amount),
                 "automatic": instance.is_automatic,
             })


# ── Finanças ────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Income)
def on_income_save(sender, instance, created, **kwargs):
    if created:
        _log(instance.user, "income_created", "finance", instance,
             props={"amount": float(instance.amount),
                    "category": instance.category.name if instance.category else None})


@receiver(post_delete, sender=Income)
def on_income_delete(sender, instance, **kwargs):
    _log(instance.user, "income_deleted", "finance", instance,
         props={"amount": float(instance.amount)})


@receiver(post_save, sender=Expense)
def on_expense_save(sender, instance, created, **kwargs):
    if created:
        _log(instance.user, "expense_created", "finance", instance,
             props={"amount": float(instance.amount),
                    "category": instance.category.name if instance.category else None})


@receiver(post_delete, sender=Expense)
def on_expense_delete(sender, instance, **kwargs):
    _log(instance.user, "expense_deleted", "finance", instance,
         props={"amount": float(instance.amount)})


@receiver(post_save, sender=Category)
def on_category_save(sender, instance, created, **kwargs):
    if created:
        _log(instance.user, "category_created", "finance", instance,
             props={"name": instance.name, "type": instance.type})