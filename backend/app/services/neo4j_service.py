from typing import Any
import os

try:
    from neo4j import GraphDatabase
except Exception:  # pragma: no cover - optional dependency
    GraphDatabase = None


class Neo4jService:
    def __init__(self) -> None:
        self.uri = os.getenv("NEO4J_URI")
        self.user = os.getenv("NEO4J_USER")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.driver = None
        if self.uri and self.user and self.password and GraphDatabase:
            try:
                self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
                self.driver.verify_connectivity()
            except Exception:
                self.driver = None

    def _run(self, query: str, params: dict) -> list[dict[str, Any]]:
        if not self.driver:
            return []
        with self.driver.session() as session:
            result = session.run(query, params)
            return [record.data() for record in result]

    def analyze_fraud_network(
        self,
        user_id: str | None,
        device_id: str | None,
        ip_address: str | None,
        phone: str | None,
    ) -> dict:
        if not self.driver or not user_id:
            return {"risk_score": 0, "flags": [], "source": "mock"}

        ingest_query = """
        MERGE (u:User {id: $user_id})
        MERGE (d:Device {id: $device_id})
        MERGE (ip:IPAddress {addr: $ip_address})
        MERGE (p:PhoneNumber {num: $phone})
        MERGE (u)-[:HAS_DEVICE]->(d)
        MERGE (u)-[:HAS_IP]->(ip)
        MERGE (u)-[:HAS_PHONE]->(p)
        """

        detection_query = """
        MATCH (u:User {id: $user_id})
        OPTIONAL MATCH (u)-[:HAS_DEVICE]->(d:Device)<-[:HAS_DEVICE]-(other_u:User)
        WITH u, count(distinct other_u) as shared_device_count
        OPTIONAL MATCH (u)-[:HAS_IP]->(ip:IPAddress)<-[:HAS_IP]-(other_ip_u:User)
        WITH u, shared_device_count, count(distinct other_ip_u) as shared_ip_count
        OPTIONAL MATCH (u)-[:HAS_PHONE]->(p:PhoneNumber)<-[:HAS_PHONE]-(fraudster:User {is_fraud: true})
        WITH u, shared_device_count, shared_ip_count, count(fraudster) as linked_fraudsters
        RETURN shared_device_count, shared_ip_count, linked_fraudsters
        """

        self._run(
            ingest_query,
            {
                "user_id": user_id,
                "device_id": device_id or f"device-{user_id}",
                "ip_address": ip_address or "unknown",
                "phone": phone or "unknown",
            },
        )
        rows = self._run(detection_query, {"user_id": user_id})
        data = rows[0] if rows else {
            "shared_device_count": 0,
            "shared_ip_count": 0,
            "linked_fraudsters": 0,
        }

        risk_score = 0
        flags: list[str] = []
        if data["shared_device_count"] > 2:
            risk_score += 40
            flags.append(
                f"High Risk: Device shared with {data['shared_device_count']} other users."
            )
        if data["shared_ip_count"] > 5:
            risk_score += 20
            flags.append(
                f"Medium Risk: IP used by {data['shared_ip_count']} users (Possible VPN/Bot)."
            )
        if data["linked_fraudsters"] > 0:
            risk_score += 100
            flags.append("CRITICAL: Linked to known fraudster via Phone Number.")

        return {
            "risk_score": min(risk_score, 100),
            "flags": flags,
            "source": "neo4j",
        }


neo4j_service = Neo4jService()
