# Railway 배포용 Dockerfile
# Node.js 20 LTS 이미지 사용
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일과 .npmrc 복사
COPY package*.json .npmrc ./

# 개발 의존성 포함하여 설치 (빌드를 위해 필요)
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# Railway 환경에서 빌드
RUN RAILWAY=true npm run build

# 프로덕션 의존성만 재설치
RUN npm prune --production --legacy-peer-deps

# 포트 노출 (Railway는 PORT 환경변수 사용)
EXPOSE ${PORT:-3000}

# 애플리케이션 시작
CMD ["npm", "start"]