# Lumina Application - Complete DevOps, Kubernetes & GitOps Deployment

## Overview

Lumina is a full-stack application deployed using a complete DevOps and GitOps workflow. The project demonstrates containerization, CI/CD automation, Kubernetes orchestration, GitOps deployment, domain routing, SSL configuration, and production-style infrastructure management.

## Technology Stack

### Application
- Frontend: Next.js
- Backend: FastAPI
- Database: MySQL

### DevOps Tools
- Git & GitHub
- Docker
- Docker Hub
- Jenkins
- Kubernetes (Kubeadm)
- ArgoCD
- NGINX Ingress Controller
- NGINX Reverse Proxy
- Let's Encrypt SSL (Certbot)

## Infrastructure Setup

### Jenkins Server
- Public IP: 13.218.147.178
- Purpose:
  - Source Code Pull
  - Docker Build
  - Docker Push
  - Manifest Update
  - CI/CD Automation

### Kubernetes Master Node
- Public IP: 54.166.238.159
- Private IP: 172.31.43.76
- Purpose:
  - API Server
  - Scheduler
  - Controller Manager
  - ETCD
  - ArgoCD
  - Cluster Management

### Kubernetes Worker Node
- Public IP: 52.55.48.87
- Private IP: 172.31.42.19
- Purpose:
  - Frontend Pods
  - Backend Pods
  - NGINX Reverse Proxy
  - Application Workloads

## Project Structure

```text
lumina_app/
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── FastAPI Source Code
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── Next.js Source Code
│
├── docker-compose.yml
│
└── kubernetes/
    ├── namespace.yaml
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    └── ingress.yaml
```

## Dockerization

### Backend Image
```bash
docker build -t ramjeet500/lumina-backend .
```

### Frontend Image
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.checkops.in -t ramjeet500/lumina-frontend .
```

## Kubernetes Deployment

- Namespace: lumina
- Backend Replicas: 2
- Frontend Replicas: 2

## Ingress Routing

Frontend:
https://checkops.in

Backend:
https://api.checkops.in

Ingress routes traffic to the appropriate Kubernetes service based on the Host header.

## NGINX Reverse Proxy

NGINX forwards internet traffic to the Kubernetes Ingress Controller NodePort.

## SSL

SSL certificates are generated using Let's Encrypt and Certbot.

## Jenkins CI/CD Flow

1. Checkout Source Code
2. Docker Login
3. Build Backend Image
4. Build Frontend Image
5. Push Images To Docker Hub
6. Clone Manifest Repository
7. Update Deployment Image Tags
8. Commit Changes
9. Push Changes To GitHub
10. ArgoCD Synchronization

## GitOps Workflow

Developer -> GitHub -> Webhook -> Jenkins -> Docker Hub -> Manifest Repo -> ArgoCD -> Kubernetes

## Verification Commands

```bash
kubectl get pods -n lumina
kubectl get deploy -n lumina
kubectl get svc -n lumina
kubectl get ingress -n lumina
kubectl get pods -n argocd
kubectl get pods -n ingress-nginx
```

## Author

Ramjeet Prajapati
GitHub: https://github.com/ramjeet51
Docker Hub: https://hub.docker.com/u/ramjeet500
