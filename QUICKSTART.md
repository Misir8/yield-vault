# 🚀 Быстрый старт

## Требования

Только **Docker** и **Docker Compose**! Больше ничего устанавливать не нужно.

## Запуск за 3 шага

### 1️⃣ Собрать образы

```bash
make build
```

Это соберёт Docker образы для:
- Hardhat (локальный блокчейн)
- Oracle (Go backend)
- Frontend (React приложение)

### 2️⃣ Запустить все сервисы

```bash
make up
```

Подождите ~30 секунд пока все сервисы запустятся. Вы увидите:
```
✅ Hardhat node: http://localhost:8545
✅ Oracle API: http://localhost:8080
✅ Frontend: http://localhost:3000
```

### 3️⃣ Задеплоить контракты

```bash
make deploy
```

Это задеплоит смарт-контракты на локальный блокчейн.

## 🎉 Готово!

Откройте браузер: **http://localhost:3000**

## Настройка MetaMask

1. Откройте MetaMask
2. Добавьте новую сеть:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH

3. Импортируйте тестовый аккаунт:
   ```bash
   make logs-hardhat
   ```
   Скопируйте приватный ключ из логов (Account #0)

## Полезные команды

```bash
make help          # Показать все команды
make logs          # Показать логи всех сервисов
make test          # Запустить тесты контрактов
make status        # Статус сервисов
make restart       # Перезапустить
make down          # Остановить
make clean         # Удалить всё
```

## Проверка работы

### Проверить Hardhat
```bash
curl http://localhost:8545
# Должен вернуть JSON-RPC ответ
```

### Проверить Oracle
```bash
curl http://localhost:8080/health
# {"status":"ok","service":"defi-oracle"}
```

### Проверить Frontend
Откройте http://localhost:3000 в браузере

## Структура проекта

```
.
├── contracts/          # Solidity контракты
│   ├── DepositContract.sol
│   └── MockStableToken.sol
├── oracle/            # Go backend
│   └── cmd/main.go
├── frontend/          # React приложение
│   └── src/
├── docker-compose.yml # Оркестрация сервисов
├── Makefile          # Команды для управления
└── README.md         # Документация
```

## Troubleshooting

### Порт уже занят
```bash
# Проверьте какие порты используются
lsof -i :8545
lsof -i :8080
lsof -i :3000

# Остановите конфликтующие процессы или измените порты в docker-compose.yml
```

### Контейнеры не запускаются
```bash
# Посмотрите логи
make logs

# Пересоберите образы
make clean
make build
make up
```

### MetaMask не подключается
- Убедитесь что Chain ID = 1337
- Убедитесь что RPC URL = http://localhost:8545
- Попробуйте сбросить аккаунт в MetaMask (Settings → Advanced → Reset Account)

## Следующие шаги

1. ✅ Запустили проект
2. 🔄 Интегрируйте Chainlink оракулы
3. 🔄 Доработайте Oracle на Go
4. 🔄 Подключите Frontend к контрактам
5. 🔄 Добавьте тесты
6. 🔄 Деплой в тестовую сеть (Sepolia/Mumbai)

## Разработка

### Изменение контрактов
```bash
# Контракты автоматически доступны в контейнере
# После изменений:
make compile
make deploy
```

### Изменение Oracle
```bash
# После изменений Go кода:
make build
make restart
```

### Изменение Frontend
```bash
# Frontend имеет hot reload
# Просто сохраните файлы в frontend/src/
```

## Документация

- [README.md](README.md) - Общая информация
- [contracts/](contracts/) - Документация контрактов
- [oracle/README.md](oracle/README.md) - Oracle API
- [frontend/README.md](frontend/README.md) - Frontend документация

## Поддержка

Если что-то не работает:
1. Проверьте `make logs`
2. Проверьте `make status`
3. Попробуйте `make restart`
4. В крайнем случае `make clean && make build && make up`
