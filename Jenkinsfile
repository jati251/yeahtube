pipeline {
    agent any

    environment {
        IMAGE_NAME = 'yeahtube-image'                   
        CONTAINER_NAME = 'yeahtube-app'               
        TAG = 'latest'
        REMOTE_USER = 'jati'
        REMOTE_HOST = '192.168.1.200'
        REMOTE_DIR = '/home/jati/yeahtube'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
            userRemoteConfigs: [[
                url: 'https://github.com/jati251/yeahtube.git',
                credentialsId: 'github-credentials'
            ]],
            branches: [[name: '*/main']]
        ])
            }
        }

        stage('Deploy to VM dockerized-app') {
            steps {
                sshagent(credentials: ['ssh-app']) {
                    sh """
            ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST '
              set -e
              set -x

              mkdir -p $REMOTE_DIR
              cd $REMOTE_DIR

              if [ ! -d .git ]; then
                git clone https://github.com/jati251/yeahtube.git . || true
              else
                git remote set-url origin https://github.com/jati251/yeahtube.git || true
                git pull || true
              fi

              docker logs $CONTAINER_NAME 2>/dev/null || true
              docker rm -f $CONTAINER_NAME 2>/dev/null || true
              docker image rm -f $IMAGE_NAME:$TAG 2>/dev/null || true
              docker image prune -f 2>/dev/null || true

              docker build -t $IMAGE_NAME:$TAG .

              docker run -d \
                --restart always \
                --name $CONTAINER_NAME \
                -p 5207:5207 \
                $IMAGE_NAME:$TAG
            '
          """
                }
            }
        }
    }
}