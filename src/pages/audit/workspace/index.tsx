import { Navigate, useParams } from 'react-router-dom';

export default function AuditWorkspaceRedirect() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const target = orgSlug ? `/${orgSlug}/audit/controls` : '/audit/controls';
  return <Navigate to={target} replace />;
}
