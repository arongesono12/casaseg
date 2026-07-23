export type AdminPropertyReviewStatus = 'verified' | 'pending' | 'restricted';

export function derivePropertyReviewStatus(status: unknown, touristLicenseStatus: unknown): AdminPropertyReviewStatus {
  const publication = typeof status === 'string' ? status.toLowerCase() : '';
  const license = typeof touristLicenseStatus === 'string' ? touristLicenseStatus.toLowerCase() : '';

  if (['restricted', 'rejected', 'suspended', 'banned', 'deleted'].includes(publication)) return 'restricted';
  if (['restricted', 'rejected', 'revoked', 'suspended', 'expired'].includes(license)) return 'restricted';
  if (['draft', 'pending', 'review', 'under_review'].includes(publication)) return 'pending';
  if (['pending', 'submitted', 'review', 'under_review'].includes(license)) return 'pending';
  return 'verified';
}
