// Lumina production pipeline.
//
// Jenkins job configuration, not this file, must supply:
//   LUMINA_DEPLOY_USER  SSH user on the application EC2 instance
//   LUMINA_DEPLOY_HOST  application EC2 hostname or IP
//   LUMINA_DEPLOY_PATH  checkout directory on that instance, for example /opt/lumina_app
//   lumina-app-ssh      SSH private key credential (sshagent)
//
// The application host must already have Docker, a clone of this repo on main,
// and a root .env file that is not stored in Git. The pipeline does not drop
// databases, volumes, or RDS data.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate backend') {
            steps {
                sh '''
                    docker run --rm -v "$PWD/backend:/app" -w /app python:3.11.17-slim \
                      python -m py_compile main.py
                '''
            }
        }

        stage('Validate frontend') {
            steps {
                sh '''
                    docker run --rm -v "$PWD/frontend:/app" -w /app node:20.20.2-alpine \
                      sh -c "npm ci && npx tsc --noEmit"
                '''
            }
        }

        stage('Build images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                sshagent(credentials: ['lumina-app-ssh']) {
                    sh '''
                        set -eu
                        : "${LUMINA_DEPLOY_USER:?Set LUMINA_DEPLOY_USER in Jenkins}"
                        : "${LUMINA_DEPLOY_HOST:?Set LUMINA_DEPLOY_HOST in Jenkins}"
                        : "${LUMINA_DEPLOY_PATH:?Set LUMINA_DEPLOY_PATH in Jenkins}"
                        ssh -o StrictHostKeyChecking=accept-new \
                          "$LUMINA_DEPLOY_USER@$LUMINA_DEPLOY_HOST" bash -s <<REMOTE
set -eu
cd "$LUMINA_DEPLOY_PATH"
git fetch origin main
git checkout main
git pull --ff-only origin main
docker compose up -d --build --remove-orphans
ok=0
for _try in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1/ready; then
    ok=1
    break
  fi
  sleep 3
done
test "\$ok" = 1
REMOTE
                    '''
                }
            }
        }
    }
}
