pipeline {
  agent any

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    string(name: 'BRANCH', defaultValue: 'main', description: 'Git branch to build')
    string(name: 'REPO_URL', defaultValue: 'https://github.com/DGStudio-d/e-commerce-builder.git', description: 'Target GitHub repository URL')
    string(name: 'GIT_CREDENTIALS_ID', defaultValue: 'github_creds', description: 'Jenkins credentials ID (Username/Password or Token)')
    // Docker publish parameters
    string(name: 'DOCKER_REGISTRY', defaultValue: 'docker.io', description: 'Docker registry hostname (e.g., docker.io)')
    string(name: 'DOCKER_REPO', defaultValue: 'alicloud0', description: 'Docker repo/namespace (e.g., yourusername)')
    string(name: 'IMAGE_NAME', defaultValue: 'e-commerce-builder', description: 'Docker image name')
    string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag')
    string(name: 'DOCKER_CREDENTIALS_ID', defaultValue: 'dockerhub_creds', description: 'Jenkins Docker Registry credentials ID')
    booleanParam(name: 'PUSH_LOCAL', defaultValue: true, description: 'Also push image to local registry')
    string(name: 'LOCAL_REGISTRY', defaultValue: 'localhost:5000', description: 'Local Docker registry (start with: docker run -d -p 5000:5000 registry:2)')
    booleanParam(name: 'START_MONITORING', defaultValue: true, description: 'Start/Update local Grafana + Prometheus stack (docker compose)')
    booleanParam(name: 'PUSH_REMOTE', defaultValue: false, description: 'Push image to remote registry (Docker Hub, etc.)')
    // Additional controls
    string(name: 'APP_PORT', defaultValue: '8087', description: 'Host port for app service mapping (host:80)')
    booleanParam(name: 'AUTO_TAG', defaultValue: true, description: 'Also tag image with BUILD_NUMBER')
    choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: 'Deployment environment label (informational)')
  }

  environment {
    NODE_OPTIONS = '--max_old_space_size=4096'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([$class: 'GitSCM', branches: [[name: params.BRANCH]], userRemoteConfigs: [[url: params.REPO_URL, credentialsId: params.GIT_CREDENTIALS_ID]]])
        script {
          echo "Checked out ${params.REPO_URL}@${params.BRANCH}"
        }
      }
    }

    stage('Install') {
      steps {
        script {
          if (isUnix()) {
            sh label: 'Install deps', script: '''#!/usr/bin/env bash
set -e
if [ -f package-lock.json ]; then npm ci; else npm install; fi
'''
          } else {
            bat label: 'Install deps', script: '''
@echo off
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)
'''
          }
        }
      }
    }

    stage('Build') {
      steps {
        script {
          if (isUnix()) {
            sh '''#!/usr/bin/env bash
set -e
npm run build --if-present
'''
          } else {
            bat '''
@echo off
call npm run build --if-present
'''
          }
        }
      }
    }

    stage('Docker: Build Image') {
      steps {
        script {
          // Ensure Docker is available on the agent
          if (isUnix()) {
            sh '''#!/usr/bin/env bash
set -e
echo "Building Docker image..."
cat > Dockerfile <<'EOF'
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --if-present

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
EOF
docker build -t ${DOCKER_REGISTRY}/${DOCKER_REPO}/${IMAGE_NAME}:${IMAGE_TAG} .
'''
          } else {
            bat '''
@echo off
echo Building Docker image...
IF NOT EXIST Dockerfile (
  >Dockerfile echo FROM node:18-alpine AS build
  >>Dockerfile echo WORKDIR /app
  >>Dockerfile echo COPY package*.json ./
  >>Dockerfile echo RUN npm ci
  >>Dockerfile echo COPY . .
  >>Dockerfile echo RUN npm run build --if-present
  >>Dockerfile echo.
  >>Dockerfile echo FROM nginx:alpine
  >>Dockerfile echo COPY --from=build /app/dist /usr/share/nginx/html
  >>Dockerfile echo EXPOSE 80
  >>Dockerfile echo CMD ["nginx","-g","daemon off;"]
)
docker build -t %DOCKER_REGISTRY%/%DOCKER_REPO%/%IMAGE_NAME%:%IMAGE_TAG% .
'''
          }
        }
      }
    }

    stage('Docker: Push Image (Remote)') {
      when { expression { return params.PUSH_REMOTE } }
      steps {
        withCredentials([usernamePassword(credentialsId: params.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          script {
            if (isUnix()) {
              sh '''#!/usr/bin/env bash
set -e
echo "Logging into Docker registry ${DOCKER_REGISTRY} as ${DOCKER_USER}..."
echo "$DOCKER_PASS" | docker login ${DOCKER_REGISTRY} -u "$DOCKER_USER" --password-stdin
docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/${IMAGE_NAME}:${IMAGE_TAG}
docker logout ${DOCKER_REGISTRY}
'''
            } else {
              bat '''
@echo off
echo Logging into Docker registry %DOCKER_REGISTRY% as %DOCKER_USER%...
echo %DOCKER_PASS% | docker login %DOCKER_REGISTRY% -u %DOCKER_USER% --password-stdin
docker push %DOCKER_REGISTRY%/%DOCKER_REPO%/%IMAGE_NAME%:%IMAGE_TAG%
docker logout %DOCKER_REGISTRY%
'''
            }
          }
        }
      }
    }

    stage('Docker: Push to Local Registry') {
      when { expression { return params.PUSH_LOCAL } }
      steps {
        script {
          def remoteImage = "${DOCKER_REGISTRY}/${DOCKER_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
          def localImage  = "${LOCAL_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
          if (isUnix()) {
            sh """#!/usr/bin/env bash
set -e
echo Tagging ${remoteImage} as ${localImage}
docker tag ${remoteImage} ${localImage}
echo Pushing ${localImage}
docker push ${localImage}
"""
          } else {
            bat """
@echo off
echo Tagging %DOCKER_REGISTRY%/%DOCKER_REPO%/%IMAGE_NAME%:%IMAGE_TAG% as %LOCAL_REGISTRY%/%IMAGE_NAME%:%IMAGE_TAG%
docker tag %DOCKER_REGISTRY%/%DOCKER_REPO%/%IMAGE_NAME%:%IMAGE_TAG% %LOCAL_REGISTRY%/%IMAGE_NAME%:%IMAGE_TAG%
echo Pushing %LOCAL_REGISTRY%/%IMAGE_NAME%:%IMAGE_TAG%
docker push %LOCAL_REGISTRY%/%IMAGE_NAME%:%IMAGE_TAG%
"""
          }
        }
      }
    }

    stage('Monitoring: Up Grafana & Prometheus') {
      when { expression { return params.START_MONITORING } }
      steps {
        script {
          def composeDir = 'ops/monitoring'
          if (fileExists(composeDir + '/docker-compose.yml')) {
            if (isUnix()) {
              sh """#!/usr/bin/env bash
set -e
# Pick image to deploy to compose: prefer local registry when PUSH_LOCAL=true, otherwise use the locally built tag
if [ "${PUSH_LOCAL}" = "true" ]; then
  IMAGE_REF="${LOCAL_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
  IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"
fi
echo "IMAGE=${IMAGE_REF}" > ${composeDir}/.env
# Bring up infra and refresh only the app service to pick the new image
docker compose -f ${composeDir}/docker-compose.yml --project-name monitoring up -d
docker compose -f ${composeDir}/docker-compose.yml --project-name monitoring up -d --no-deps --force-recreate app
"""
            } else {
              bat """
@echo off
REM Pick image to deploy to compose: prefer local registry when PUSH_LOCAL=true, otherwise use the locally built tag
set IMAGE_REF=%IMAGE_NAME%:%IMAGE_TAG%
if /I "%PUSH_LOCAL%"=="true" (
  set IMAGE_REF=%LOCAL_REGISTRY%/%IMAGE_NAME%:%IMAGE_TAG%
)
echo IMAGE=%IMAGE_REF%> %WORKSPACE%\\%composeDir%\\.env
REM Bring up infra and refresh only the app service to pick the new image
docker compose -f %WORKSPACE%\\%composeDir%\\docker-compose.yml --project-name monitoring up -d
docker compose -f %WORKSPACE%\\%composeDir%\\docker-compose.yml --project-name monitoring up -d --no-deps --force-recreate app
"""
            }
          } else {
            echo "Monitoring compose not found at ${composeDir}/docker-compose.yml. Skipping."
          }
        }
      }
    }

    stage('Test') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm test --if-present'
          } else {
            bat 'call npm test --if-present'
          }
        }
      }
    }

    stage('Lint (optional)') {
      when { expression { fileExists('package.json') } }
      steps {
        script {
          if (isUnix()) {
            sh 'npm run lint --if-present || true'
          } else {
            bat 'call npm run lint --if-present || exit /b 0'
          }
        }
      }
    }

    stage('Commit & Push changes (if any)') {
      steps {
        withCredentials([
          usernamePassword(credentialsId: params.GIT_CREDENTIALS_ID, usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')
        ]) {
          script {
            def gitEmail = "ci@jenkins"
            def gitName  = "Jenkins CI"

            if (isUnix()) {
              sh '''#!/usr/bin/env bash
set -e
# Configure git
git config user.email "''' + gitEmail + '''"
git config user.name  "''' + gitName  + '''"
# Check changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Changes detected, committing..."
  git add -A
  git commit -m "CI: automated update build ${BUILD_NUMBER}"
  # Build authenticated remote URL (use sed to avoid Groovy escaping issues)
  REMOTE_URL=$(git config --get remote.origin.url)
  AUTH_URL=$(printf "%s" "$REMOTE_URL" | sed "s#https://#https://$GIT_USER:$GIT_PASS@#")
  git push "$AUTH_URL" "HEAD:${BRANCH}"
else
  echo "No changes to commit."
fi
'''
            } else {
              bat '''
@echo off
setlocal enableextensions enabledelayedexpansion
REM Configure git
git config user.email "''' + gitEmail + '''"
git config user.name  "''' + gitName  + '''"
for /f "tokens=*" %%i in ('git status --porcelain') do set CHANGED=1
if defined CHANGED (
  echo Changes detected, committing...
  git add -A
  git commit -m "CI: automated update build %BUILD_NUMBER%"
  for /f "tokens=*" %%r in ('git config --get remote.origin.url') do set REMOTE_URL=%%r
  set AUTH_URL=!REMOTE_URL:https://=https://%GIT_USER%:%GIT_PASS%@!
  git push !AUTH_URL! HEAD:%BRANCH%
) else (
  echo No changes to commit.
)
endlocal
'''
            }
          }
        }
      }
    }
  }

  post {
    success {
      archiveArtifacts artifacts: 'dist/**', onlyIfSuccessful: true, allowEmptyArchive: true
      echo 'Build succeeded.'
    }
    failure {
      echo 'Build failed.'
    }
  }
}
