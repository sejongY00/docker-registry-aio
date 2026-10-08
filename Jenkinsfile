def isMain() {
  def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
  return !env.CHANGE_ID && branch in ['main', 'origin/main', 'refs/heads/main']
}

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
      // main is built by Deploy itself; building here too would double the time.
      when { not { expression { isMain() } } }
      steps {
        // Image check only. The agent uses the legacy builder, which leaves untagged images
        // for the deps/build stages, so tag every stage and remove them all afterwards.
        sh '''
          set -eu
          tag="registry-aio-app-ci:$(printf '%s' "$BUILD_TAG" | tr -c 'A-Za-z0-9_.-' '-' | cut -c1-120)"
          trap 'docker image rm "$tag-deps" "$tag-build" "$tag" >/dev/null 2>&1 || true' EXIT
          docker build -q --target deps -t "$tag-deps" app
          docker build -q --target build -t "$tag-build" app
          docker build -q -t "$tag" app
        '''
      }
    }

    stage('Deploy') {
      when { expression { isMain() } }
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
