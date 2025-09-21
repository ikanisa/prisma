# Acceptance Script – Handoff Delivery & Archive

## Objective
Validate end-to-end client handoff delivery with approvals, client access, and archive generation including checksum validation.

## Preconditions
- Engagement with deliverable artifacts ready (documents, dashboards).
- Client portal access for confirmation.
- Archive tooling configured with manifest output.

## Steps
1. **Prepare deliverable package**
   - Compile final documents (FS, memos, schedules) into Documents module; note docIds.
2. **Initiate BUILD handoff**
   - Trigger handoff build via agent or UI (`handoff.build` tool).
   - Confirm result includes manifest preview with file list.
3. **Request SEND approval**
   - Execute SEND action; expect `status: 'BLOCKED'` with `approvalId` (`APP-HANDOFF-*`).
   - Manager reviews Approvals page, confirms evidence links, approves.
   - Capture Activity log `APPROVAL_GRANTED` with metadata (toolKey, approvalId).
4. **Client confirmation**
   - Log in as client; verify share link accessible and downloads succeed (signed URLs).
   - Record timestamp and link.
5. **Generate ARCHIVE**
   - Run archive tool; expect manifest file containing SHA-256 for each artifact.
   - Archive action should be blocked pending approval (`APP-ARCHIVE-*`); manager approves.
6. **Verify archive storage**
   - Check Documents module for archive package and manifest file.
   - Validate checksum using provided SHA-256 values (manual or script) and note results.
7. **Telemetry & logs**
   - Ensure approvals pending count returns to 0 once both approvals complete.
   - Activity log and telemetry reflect two approvals and archive creation.

## Expected Outcomes
- Approvals recorded for SEND and ARCHIVE with evidence references.
- Client receives functional share link; archive manifest with hashes stored.
- Activity log contains entries for tool calls, approvals, document creation.

## Evidence to Capture
- `approval_queue.id` for SEND/ARCHIVE actions.
- Manifest file docId and SHA-256 verification output.
- Client portal screenshot showing deliverable access.
- Telemetry snapshot after completion.

