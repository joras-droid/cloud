/** User-safe message for failed menu/media uploads (no secrets in copy). */
export function menuUploadErrorMessage(err: unknown): string {
  const e = err as { Code?: string; name?: string };
  const code = e.Code ?? e.name;

  if (code === "InvalidAccessKeyId" || code === "SignatureDoesNotMatch") {
    return "AWS credentials are wrong or expired. Fix AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local, or remove all AWS_* lines to store uploads on this server instead.";
  }
  if (code === "AccessDenied" || code === "NoSuchBucket") {
    return "AWS rejected the upload. Check the bucket name, region (us-east-2 for shotcaller), and IAM permissions for s3:PutObject.";
  }

  return "Upload failed. Check S3 settings or use local uploads (leave AWS_* empty in .env.local).";
}
