export function AuditApprovalsBanner() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
      <p className="text-sm font-medium">Approvals synced to shared register</p>
      <p className="text-xs text-amber-800">
        Control testing and analytics runs now create manager review tasks automatically. Use the approvals queue to release
        deliverables once sign-offs are complete.
      </p>
    </div>
  );
}
