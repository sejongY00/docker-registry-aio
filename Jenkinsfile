pipeline {
  agent any

  environment {
    SSH_CONFIG_NAME = 'SEJONG-NAS'
    DEPLOY_DIR = '/volume1/docker/docker-registry-aio'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Validate') {
      steps {
        sh '''
          set -eu
          # No .env in the workspace: compose falls back to defaults, enough to check syntax.
          docker compose config -q
          sh -n scripts/deploy.sh
        '''
      }
    }

    stage('Build') {
      steps {
        // Same Dockerfile the NAS builds; the agent shares the host daemon,
        // so this also warms the build cache for the Deploy stage.
        sh '''
          set -eu
          tag="registry-aio-app-ci:$(printf '%s' "$BUILD_TAG" | tr -c 'A-Za-z0-9_.-' '-' | cut -c1-128)"
          trap 'docker image rm "$tag" >/dev/null 2>&1 || true' EXIT
          docker build -t "$tag" app
        '''
      }
    }

    stage('Deploy') {
      when {
        allOf {
          not { changeRequest() }
          anyOf {
            branch 'main'
            expression {
              def branch = env.GIT_BRANCH ?: env.BRANCH_NAME ?: ''
              branch == 'main' || branch == 'origin/main' || branch == 'refs/heads/main'
            }
          }
        }
      }
      steps {
        // Keep the existing flow: the NAS checkout is the deployment.
        // Fast-forward it to the built commit, then rebuild app and `compose up -d` there.
        sshPublisher(
          failOnError: true,
          publishers: [
            sshPublisherDesc(
              configName: env.SSH_CONFIG_NAME,
              verbose: true,
              transfers: [
                sshTransfer(
                  execTimeout: 1800000,
                  usePty: true,
                  execCommand: """
                    sudo -n su -c 'set -eu; export PATH=/usr/local/bin:/usr/bin:/bin; cd "${env.DEPLOY_DIR}"; git fetch -q origin main; git checkout -q main; git merge --ff-only "${env.GIT_COMMIT}"; sh scripts/deploy.sh'
                  """.stripIndent().trim()
                )
              ]
            )
          ]
        )
      }
    }
  }
}
