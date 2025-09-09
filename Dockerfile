# Railway 배포용 Dockerfile
# Node.js 20 LTS 이미지 사용
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# TypeScript 컴파일 및 빌드
RUN npm run build

# 포트 노출 (Railway는 PORT 환경변수 사용)
EXPOSE ${PORT:-3000}

# 애플리케이션 시작
CMD ["npm", "start"]