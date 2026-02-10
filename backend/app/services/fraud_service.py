from app.services.neo4j_service import neo4j_service


def analyze_fraud(user_id: str | None, device_id: str | None, ip_address: str | None, phone: str | None) -> dict:
    result = neo4j_service.analyze_fraud_network(
        user_id=user_id,
        device_id=device_id,
        ip_address=ip_address,
        phone=phone,
    )

    risk_score = result.get("risk_score", 0)
    flags = result.get("flags", [])

    return {
        "risk_score": risk_score,
        "flags": flags,
        "recommendation": "REJECT" if risk_score > 70 else "APPROVE",
        "source": result.get("source", "mock"),
    }
