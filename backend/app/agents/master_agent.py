from dataclasses import dataclass, field
from typing import Any

from app.agents.sales_agent import handle_sales
from app.agents.verification_agent import handle_verification
from app.agents.underwriting_agent import handle_underwriting
from app.agents.sanction_agent import generate_sanction_letter
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

        if session.application_status in {"approved", "rejected"}:
            if session.application_status == "approved":
                return AgentResponse(
                    "You’re already approved. Would you like me to resend your sanction letter?",
                    meta,
                )
            return AgentResponse(
                f"Your application is already closed. Reason: {session.rejection_reason}",
                meta,
            )

        if session.stage == "sales":
            response = handle_sales(session, message)
            if session.requested_amount and session.tenure_months and session.loan_purpose and session.monthly_income:
                session.stage = "verification"
                session.expected_input = "phone"
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
                update_session(session)
                return AgentResponse(response, meta)
            if session.phone_number and session.address:
                session.stage = "underwriting"
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

            update_session(session)
            return AgentResponse(response, meta)

        if session.stage == "awaiting_salary":
            if session.salary_slip_uploaded:
                session.stage = "underwriting"
                update_session(session)
                return self.handle_message(session, message, device_id, ip_address)
            return AgentResponse(
                "Please upload your salary slip to proceed with the approval.",
                {**meta, "requires_upload": True},
            )

        return AgentResponse(
            "Let’s continue. Could you share the required details to proceed?",
            meta,
        )
