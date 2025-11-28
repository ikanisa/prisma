import os
import contextlib
from email.message import EmailMessage
from email.utils import formataddr
from typing import Optional, Sequence

import aiosmtplib
import structlog

logger = structlog.get_logger().bind(component="smtp_email")


def _str_to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Prisma Glow")
SMTP_USE_SSL = _str_to_bool(os.getenv("SMTP_USE_SSL"))
SMTP_USE_STARTTLS = _str_to_bool(os.getenv("SMTP_USE_STARTTLS"), default=not SMTP_USE_SSL)
SMTP_TIMEOUT = float(os.getenv("SMTP_TIMEOUT_SECONDS", "10"))


async def send_email_message(message: EmailMessage) -> bool:
    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        logger.warning("smtp.configuration_missing")
        return False

    client = aiosmtplib.SMTP(
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        use_tls=SMTP_USE_SSL,
        timeout=SMTP_TIMEOUT,
    )

    try:
        await client.connect()
        if SMTP_USE_STARTTLS and not SMTP_USE_SSL:
            await client.starttls()
        if SMTP_USERNAME:
            await client.login(SMTP_USERNAME, SMTP_PASSWORD or "")
        await client.send_message(message)
        return True
    except aiosmtplib.errors.SMTPException as exc:  # pragma: no cover - network side effect
        logger.error("smtp.send_failed", error=str(exc))
        return False
    finally:
        with contextlib.suppress(Exception):
            await client.quit()


def build_email_message(
    subject: str,
    recipients: Sequence[str],
    text_body: str,
    html_body: Optional[str] = None,
) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL or "noreply@example.com"))
    message["To"] = ", ".join(recipients)
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")
    return message


def build_invite_email_content(
    invite_link: str,
    org_name: Optional[str],
    role: str,
    inviter_name: Optional[str],
    expires_at: Optional[str],
) -> tuple[str, str]:
    safe_org = org_name or "Prisma Glow"
    safe_role = role.replace("_", " ").title()
    safe_inviter = inviter_name or "a workspace administrator"

    text_body = (
        f"Hello,\n\n"
        f"You have been invited to join {safe_org} as {safe_role} by {safe_inviter}.\n"
        f"Accept your invitation: {invite_link}\n\n"
        f"This link will expire on {expires_at or 'the scheduled expiry date'}.\n\n"
        "If you were not expecting this invitation you can safely ignore this message."
    )

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Hello,</p>
        <p>
          You have been invited to join <strong>{safe_org}</strong> as <strong>{safe_role}</strong>
          by {safe_inviter}.
        </p>
        <p style="margin: 24px 0;">
          <a href="{invite_link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
            Accept your invitation
          </a>
        </p>
        <p>
          This link will expire on {expires_at or 'the scheduled expiry date'}.
          If you were not expecting this invitation you can safely ignore this email.
        </p>
      </body>
    </html>
    """.strip()

    return text_body, html_body


async def send_member_invite_email(
    recipient: str,
    invite_link: str,
    org_name: Optional[str],
    role: str,
    inviter_name: Optional[str],
    expires_at: Optional[str],
) -> bool:
    text_body, html_body = build_invite_email_content(invite_link, org_name, role, inviter_name, expires_at)
    message = build_email_message(
        subject=f"You're invited to join {org_name or 'Prisma Glow'}",
        recipients=[recipient],
        text_body=text_body,
        html_body=html_body,
    )
    return await send_email_message(message)
