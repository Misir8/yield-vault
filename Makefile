.PHONY: help build up down logs clean deploy test

help: ## Show help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo "Services started:"
	@echo "  - Hardhat node: http://localhost:8545"
	@echo "  - Oracle API: http://localhost:8080"
	@echo "  - Frontend: http://localhost:3000"

down: ## Stop all services
	docker-compose down

logs: ## Show logs of all services
	docker-compose logs -f

logs-hardhat: ## Show Hardhat logs
	docker-compose logs -f hardhat

logs-oracle: ## Show Oracle logs
	docker-compose logs -f oracle

logs-frontend: ## Show Frontend logs
	docker-compose logs -f frontend

clean: ## Clean all data and images
	docker-compose down -v
	docker system prune -f

deploy: ## Deploy contracts
	docker-compose exec hardhat npx hardhat run scripts/deploy.js --network localhost

test: ## Run contract tests
	docker-compose exec hardhat npx hardhat test

compile: ## Compile contracts
	docker-compose exec hardhat npx hardhat compile

shell-hardhat: ## Open shell in Hardhat container
	docker-compose exec hardhat sh

shell-oracle: ## Open shell in Oracle container
	docker-compose exec oracle sh

shell-frontend: ## Open shell in Frontend container
	docker-compose exec frontend sh

restart: ## Restart all services
	docker-compose restart

status: ## Show services status
	docker-compose ps
