"""
Corporate Governance Tools
Tools for compliance tracking and board management
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

def track_compliance_deadlines(
    jurisdiction: str,
    entity_type: str,
    incorporation_date: str
) -> Dict[str, Any]:
    """
    Track upcoming corporate compliance deadlines.

    Args:
        jurisdiction: 'MT', 'RW'
        entity_type: Entity type
        incorporation_date: Date of incorporation (YYYY-MM-DD)

    Returns:
        List of deadlines
    """
    deadlines = []
    inc_date = datetime.strptime(incorporation_date, "%Y-%m-%d")
    current_year = datetime.now().year

    if jurisdiction == "MT":
        # Annual Return
        anniversary = inc_date.replace(year=current_year)
        ar_deadline = anniversary + timedelta(days=42)
        deadlines.append({
            "filing": "Annual Return",
            "due_date": ar_deadline.strftime("%Y-%m-%d"),
            "description": "Confirmation of company details and shareholders"
        })

        # Tax Return
        # Simplified: 9 months after year end (assuming Dec 31 year end)
        tax_deadline = datetime(current_year, 9, 30)
        deadlines.append({
            "filing": "Corporate Tax Return",
            "due_date": tax_deadline.strftime("%Y-%m-%d"),
            "description": "Tax return for previous financial year"
        })

    elif jurisdiction == "RW":
        # Annual Return
        # Usually due by March 31st
        ar_deadline = datetime(current_year, 3, 31)
        deadlines.append({
            "filing": "Annual Declaration",
            "due_date": ar_deadline.strftime("%Y-%m-%d"),
            "description": "RDB Annual Declaration"
        })

        # CIT Return
        cit_deadline = datetime(current_year, 3, 31)
        deadlines.append({
            "filing": "CIT Declaration",
            "due_date": cit_deadline.strftime("%Y-%m-%d"),
            "description": "Corporate Income Tax declaration"
        })

    return {
        "jurisdiction": jurisdiction,
        "entity_type": entity_type,
        "upcoming_deadlines": deadlines,
        "status": "Active"
    }

def prepare_board_minutes(
    meeting_date: str,
    attendees: List[str],
    agenda_items: List[str],
    resolutions: List[str]
) -> Dict[str, Any]:
    """
    Generate draft board minutes.

    Args:
        meeting_date: Date of meeting
        attendees: List of attendees
        agenda_items: List of agenda topics
        resolutions: List of resolutions passed

    Returns:
        Draft minutes structure
    """
    minutes = f"""
BOARD MEETING MINUTES

DATE: {meeting_date}
PRESENT: {', '.join(attendees)}

AGENDA:
{chr(10).join(f'- {item}' for item in agenda_items)}

PROCEEDINGS:
The Chairperson opened the meeting and noted that a quorum was present.

RESOLUTIONS:
IT WAS RESOLVED THAT:
{chr(10).join(f'- {res}' for res in resolutions)}

There being no further business, the meeting was closed.

__________________
Chairperson
"""

    return {
        "meeting_date": meeting_date,
        "attendees_count": len(attendees),
        "resolutions_count": len(resolutions),
        "draft_minutes_text": minutes.strip()
    }
