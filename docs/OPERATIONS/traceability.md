# Assurance traceability matrix

| Standard | Requirement | Implementation anchor | Evidence |
| --- | --- | --- | --- |
| ISA 402 | Understand service organization controls, evaluate complementary user entity controls, and document residual risk. | Supabase tables `service_orgs`, `soc1_reports`, `soc1_cuecs`, `soc1_residual_risk_notes`; REST endpoints under `/api/soc/*`; SOC oversight UI at `/audit/soc`. | Activity log events (`soc_service_org_registered`, `soc_report_uploaded`, `soc_cuec_created`, `soc_cuec_updated`, `soc_residual_risk_logged`); SOC dashboard screenshots or exports; Supabase RLS policies enforcing role access. |

_Add further standards as workflows are implemented._
