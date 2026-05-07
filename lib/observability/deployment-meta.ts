export function getDeploymentMeta() {
  return {
    commit:
      process.env.NEXT_PUBLIC_GIT_SHA?.trim() ||
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.COMMIT_REF?.trim() ||
      null,
    deployUrl: process.env.URL?.trim() || process.env.DEPLOY_URL?.trim() || null,
    context: process.env.CONTEXT?.trim() || null,
    nodeEnv: process.env.NODE_ENV,
  };
}
