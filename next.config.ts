import type { NextConfig } from "next";

// GitHub Pages(프로젝트 페이지)는 https://<user>.github.io/<repo>/ 경로로 서빙되므로
// basePath/assetPrefix를 저장소 이름으로 고정한다. 서버가 없으므로 완전 정적 내보내기(export)로 빌드한다.
const REPO_NAME = "ai-inbox-pages";

const nextConfig: NextConfig = {
  output: "export",
  basePath: `/${REPO_NAME}`,
  assetPrefix: `/${REPO_NAME}/`,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
