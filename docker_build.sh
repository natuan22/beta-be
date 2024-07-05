#!/bin/zsh

IMAGE="chauminh/beta-be"
VERSION="0.0.99"

docker build --platform linux/amd64 -t ${IMAGE}:${VERSION} .
docker push ${IMAGE}:${VERSION}
