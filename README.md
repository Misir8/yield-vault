# DeFi Deposit Platform

Платформа для депозитов в стабильных токенах с динамическими процентными ставками на основе оракулов.

## Структура проекта

```
.
├── contracts/          # Solidity смарт-контракты
├── oracle/            # Go backend и oracle сервис
├── frontend/          # React приложение
├── scripts/           # Скрипты для деплоя
└── test/             # Тесты для контрактов
```

## Компоненты

### 1. Smart Contracts (Solidity)
Smart contracts for managing deposits with Global Index pattern for scalability.
- **Vault.sol**: Main deposit contract using efficient interest calculation
- **MockStableToken.sol**: Test USDT token for local development

### 2. Oracle Service (Go)
Backend сервис для мониторинга блокчейна и агрегации данных.

### 3. Frontend (React)
Web интерфейс для взаимодействия с платформой.

## Начало работы

### Требования
- Docker
- Docker Compose
- MetaMask или другой Web3 кошелёк

### Быстрый старт

```bash
# 1. Собрать все Docker образы
make build

# 2. Запустить все сервисы
make up

# 3. Задеплоить контракты
make deploy

# 4. Открыть приложение
# Frontend: http://localhost:3000
# Oracle API: http://localhost:8080
# Hardhat RPC: http://localhost:8545
```

### Полезные команды

```bash
make help          # Показать все доступные команды
make logs          # Показать логи всех сервисов
make test          # Запустить тесты контрактов
make down          # Остановить все сервисы
make clean         # Очистить все данные
make restart       # Перезапустить сервисы
```

### Настройка MetaMask

1. Добавьте локальную сеть:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Импортируйте тестовый аккаунт из логов Hardhat:
   ```bash
   make logs-hardhat
   ```

## Разработка

Проект находится в активной разработке. Текущий этап: разработка смарт-контракта.

### Быстрый старт для разработчиков

См. [QUICKSTART.md](QUICKSTART.md) для детальных инструкций.

```bash
make build   # Собрать Docker образы
make up      # Запустить все сервисы
make deploy  # Задеплоить контракты
```

### Архитектура

- **Hardhat Node** (порт 8545) - локальный Ethereum блокчейн
- **Oracle Service** (порт 8080) - Go REST API для взаимодействия с блокчейном
- **Frontend** (порт 3000) - React приложение для пользователей

Все сервисы работают в Docker контейнерах и автоматически связаны между собой.

## Лицензия

MIT
