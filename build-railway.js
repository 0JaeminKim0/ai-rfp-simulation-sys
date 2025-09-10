// Railway용 간단한 TypeScript -> JavaScript 컨버터
import fs from 'fs/promises'
import path from 'path'

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      let content = await fs.readFile(srcPath, 'utf-8')
      // 파일 확장자를 .ts/.tsx -> .js로 변경
      const outputFile = destPath.replace(/\.tsx?$/, '.js')
      await fs.writeFile(outputFile, content, 'utf-8')
    }
  }
}

async function convertTsxToJs() {
  console.log('🔄 Converting TypeScript to JavaScript for Railway...')
  
  try {
    // dist 디렉토리 생성
    const distDir = path.join(process.cwd(), 'dist')
    await fs.mkdir(distDir, { recursive: true })
    
    // services, config, types, utils 디렉토리 복사
    const srcDir = path.join(process.cwd(), 'src')
    const directories = ['services', 'config', 'types', 'utils']
    
    for (const dir of directories) {
      const srcPath = path.join(srcDir, dir)
      const destPath = path.join(distDir, dir)
      
      try {
        await copyDirectory(srcPath, destPath)
        console.log(`✅ Copied ${dir} directory`)
      } catch (error) {
        console.log(`⚠️  Directory ${dir} not found, skipping`)
      }
    }
    
    // src/index.tsx 읽기
    const sourceFile = path.join(process.cwd(), 'src', 'index.tsx')
    let content = await fs.readFile(sourceFile, 'utf-8')
    
    // 간단한 TypeScript -> JavaScript 변환
    console.log('🔧 Removing TypeScript syntax...')
    
    // 1단계: 타입 어노테이션 제거
    content = content
      // 변수 및 파라미터의 타입 어노테이션 제거
      .replace(/:\s*[A-Za-z0-9<>\[\]|&\s,{}._]*(?=\s*[=,);])/g, '')
      // 객체 속성의 타입 어노테이션 제거 (더 정확한 패턴)
      .replace(/(\w+):\s*[A-Za-z0-9<>\[\]|&\s,{}._]*(?=\s*[,}])/g, '$1')
      // any[] 타입 제거
      .replace(/:\s*any\[\]/g, '')
      // 함수 반환 타입 제거
      .replace(/\):\s*[A-Za-z0-9<>\[\]|&\s,{}._]*(?=\s*[{=])/g, ')')
      
    // 2단계: TypeScript 구문 제거 (순서 중요!)
    content = content
      .replace(/interface\s+\w+\s*{[\s\S]*?}/g, '') // 인터페이스 제거
      .replace(/import\s+type\s+{[\s\S]*?}\s+from[^;]+;/g, '') // type import 제거
      .replace(/\/\/\s*타입\s*임포트[\s\S]*?(?=\/\/|\n\n|\nimport|\nconst)/g, '') // 타입 임포트 섹션 제거
      // Bindings 타입 완전 제거
      .replace(/type\s+Bindings\s*=\s*{[\s\S]*?}\s*\n/g, '') // Bindings 타입 제거
      .replace(/\s+DB;\s+KV;\s+OPENAI_API_KEY;\s*}/g, '') // 남은 Bindings 속성 제거
      .replace(/new\s+Hono<[^>]*>/g, 'new Hono') // Hono 제네릭 타입 제거
      .replace(/new\s+Map<[^>]*>/g, 'new Map') // Map 제네릭 타입 제거
      .replace(/as\s+\w+/g, '') // as 타입캐스팅 제거
      // 다른 type 정의 제거 (app 정의 이후)
      .replace(/(const\s+app\s*=[\s\S]*?\n)([\s\S]*?)(\ntype\s+\w+\s*=[\s\S]*?(?=\n\w|\n$))/g, '$1$2') // app 정의 이후 type 제거
      
    // 3단계: import 경로 수정 및 정리
    content = content
      .replace(/from\s+['"]\.\/([^'"]+)\.tsx?['"]/g, "from './$1.js'") // import 경로 수정
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 여러 빈 줄을 2줄로 줄이기
    
    // dist/index.js로 저장
    const outputFile = path.join(distDir, 'index.js')
    await fs.writeFile(outputFile, content, 'utf-8')
    
    console.log('✅ TypeScript converted to JavaScript successfully')
    console.log(`📁 Output: ${outputFile}`)
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message)
    process.exit(1)
  }
}

convertTsxToJs()