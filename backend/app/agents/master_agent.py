from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.agents.sales_agent import handle_sales
from app.agents.sanction_agent import generate_sanction_letter
from app.agents.underwriting_agent import handle_underwriting
from app.agents.verification_agent import handle_verification
from app.services.session_store import SessionState, update_session


@dataclass
class AgentResponse:
    text: str
    meta: dict[str, Any] = field(default_factory=dict)


class MasterAgent:
    def handle_message(
        self,
        session: SessionState,
        message: str,
        device_id: str | None = None,
        ip_address: str | None = None,
    ) -> AgentResponse:
        message = message.strip()
        meta: dict[str, Any] = {"session_id": session.session_id}

        if session.application_status in {"approved", "rejected", "manual_review"}:
            if session.application_status == "approved":
                return AgentResponse(
                    "You are already approved. Would you like me to resend your sanction letter?",
                    meta,
                )
            if session.application_status == "manual_review":
                return AgentResponse(
                    "Your application is under manual review. We will update you shortly.",
                    meta,
                )
            return AgentResponse(
                f"Your application is already closed. Reason: {session.rejection_reason}",
                meta,
            )

        if message:
            session.history.append({"role": "user", "content": message})

        if session.stage == "sales":
            response, sales_meta = handle_sales(session, message)
            meta.update(sales_meta)
            if response:
                session.history.append({"role": "assistant", "content": response})
            update_session(session)
            return AgentResponse(response, meta)

        if session.stage == "verification":
            response, verification_meta = handle_verification(
                session, message, device_id, ip_address
            )
            meta.update(verification_meta)
            if session.application_status == "rejected":
                meta["application_status"] = "rejected"
                meta["rejection_reason"] = session.rejection_reason
                if response:
                    session.history.append({"role": "assistant", "content": response})
                update_session(session)
                return AgentResponse(response, meta)
            if session.stage == "underwriting":
                response, underwriting_meta = handle_underwriting(session)
                meta.update(underwriting_meta)
                if underwriting_meta.get("requires_upload"):
                    session.stage = "awaiting_salary"
                if session.application_status == "approved":
                    sanction = generate_sanction_letter(session)
                    meta["sanction_letter"] = sanction
                    meta["application_status"] = "approved"
                if session.application_status == "rejected":
                    meta["rejection_reason"] = session.rejection_reason
                    meta["application_status"] = "rejected"
            if response:
                session.history.append({"role": "assistant", "content": response})
            update_session(session)
            return AgentResponse(response, meta)

        if session.stage == "underwriting":
            response, underwriting_meta = handle_underwriting(session)
            meta.update(underwriting_meta)

            if underwriting_meta.get("requires_upload"):
                session.stage = "awaiting_salary"

            if session.application_status == "approved":
                sanction = generate_sanction_letter(session)
                meta["sanction_letter"] = sanction
                meta["application_status"] = "approved"
            if session.application_status == "rejected":
                meta["rejection_reason"] = session.rejection_reason
                meta["application_status"] = "rejected"

            if response:
                session.history.append({"role": "assistant", "content": response})
            update_session(session)
            return AgentResponse(response, meta)

        if session.stage == "awaiting_salary":
            if session.salary_slip_uploaded:
                session.stage = "underwriting"
                response, underwriting_meta = handle_underwriting(session)
                meta.update(underwriting_meta)
                if session.application_status == "approved":
                    sanction = generate_sanction_letter(session)
                    meta["sanction_letter"] = sanction
                    meta["application_status"] = "approved"
                if session.application_status == "rejected":
                    meta["rejection_reason"] = session.rejection_reason
                    meta["application_status"] = "rejected"
                if response:
                    session.history.append({"role": "assistant", "content": response})
                update_session(session)
                return AgentResponse(response, meta)
            response = "Please upload your salary slip to proceed with the approval."
            session.history.append({"role": "assistant", "content": response})
            update_session(session)
            return AgentResponse(response, {**meta, "requires_upload": True})

        return AgentResponse(
            "Lets continue. Could you share the required details to proceed?",
            meta,
        )
