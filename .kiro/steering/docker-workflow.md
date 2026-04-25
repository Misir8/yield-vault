---
inclusion: auto
---

# Docker Workflow для разработки

## Архитектура Docker

Проект использует Docker Compose для оркестрации трёх сервисов:

### 1. Hardhat (Blockchain Node)
- **Порт**: 8545
- **Образ**: node:18-alpine
- **Назначение**: Локальная Ethereum нода для разработки
- **Volumes**: Контракты, скрипты, тесты

### 2. Oracle Service (Go Backend)
- **Порт**: 8080
- **Образ**: golang:1.21-alpine
- **Назначение**: REST API и мониторинг блокчейна
- **Зависимости**: Hardhat должен быть запущен

### 3. Frontend (React)
- **Порт**: 3000
- **Образ**: node:18-alpine
- **Назначение**: Web интерфейс
- **Зависимости**: Hardhat и Oracle

## Основные команды

### Запуск проекта
```bash
make build    # Первый раз - собрать образы
make up       # Запустить все сервисы
make deploy   # Задеплоить контракты
```

### Разработка
```bash
make logs              # Все логи
make logs-hardhat      # Логи блокчейна
make logs-oracle       # Логи Oracle
make logs-frontend     # Логи Frontend

make test              # Тесты контрактов
make compile           # Компиляция контрактов
```

### Отладка
```bash
make shell-hardhat     # Shell в контейнере Hardhat
make shell-oracle      # Shell в контейнере Oracle
make shell-frontend    # Shell в контейнере Frontend
```

### Остановка и очистка
```bash
make down      # Остановить сервисы
make restart   # Перезапустить
make clean     # Удалить всё (volumes, images)
```

## Hot Reload

Все сервисы настроены с hot reload:
- **Контракты**: Изменения в `/contracts` автоматически доступны
- **Oracle**: Требуется пересборка образа
- **Frontend**: Автоматический reload при изменении `/src`

## Сеть

Все сервисы находятся в одной Docker сети `defi-network`:
- Hardhat доступен по имени `hardhat:8545`
- Oracle доступен по имени `oracle:8080`
- Frontend доступен по имени `frontend:3000`

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните после деплоя:
```bash
cp .env.example .env
```

## Troubleshooting

### Hardhat не запускается
```bash
make logs-hardhat
# Проверьте порт 8545
```

### Oracle не подключается к Hardhat
```bash
# Проверьте healthcheck
docker-compose ps
# Перезапустите
make restart
```

### Frontend не видит контракты
```bash
# Убедитесь что контракты задеплоены
make deploy
# Проверьте адреса в .env
```
