# Configuration Summary

## 📋 Созданные файлы

### 1. **default.json** - Базовая конфигурация
Содержит все настройки по умолчанию для всех окружений.

**Основные секции:**
- ✅ Server (порт, CORS, API prefix)
- ✅ Blockchain (RPC, chainId, контракты)
- ✅ Database (PostgreSQL настройки)
- ✅ Redis (кэширование)
- ✅ Keeper (интервалы, пороги)
- ✅ Indexer (события, батчи)
- ✅ Analytics (метрики)
- ✅ Swagger (документация API)
- ✅ Logging (уровни, формат)
- ✅ Security (rate limiting, helmet)
- ✅ Monitoring (health checks, метрики)

### 2. **local.json** - Локальная разработка
Оптимизирован для быстрой разработки на localhost.

**Особенности:**
- 🏠 Hardhat Network (localhost:8545)
- 🔧 Synchronize: true (автосоздание таблиц)
- 🐛 Debug логирование
- ⚡ Быстрые интервалы (keeper каждую минуту)
- 📚 Swagger включен

### 3. **dev.json** - Development сервер
Для тестирования на dev окружении (Sepolia testnet).

**Особенности:**
- 🌐 Sepolia testnet
- 🔒 SSL для БД
- 📊 Info логирование
- ⏱️ Средние интервалы
- 🔐 Rate limiting включен

### 4. **prod.json** - Production
Оптимизирован для production (Ethereum Mainnet).

**Особенности:**
- 🚀 Ethereum Mainnet
- 🔒 Максимальная безопасность
- ⚠️ Warn логирование
- 🛡️ Helmet включен
- 📊 Swagger выключен
- 💰 Консервативные пороги

### 5. **test.json** - Тестирование
Для unit и e2e тестов.

**Особенности:**
- 🧪 Отдельная тестовая БД
- 🔄 dropSchema: true (очистка перед тестами)
- 🚫 Keeper/Indexer выключены
- 📝 Минимальное логирование

### 6. **custom-environment-variables.json** - Env маппинг
Связывает переменные окружения с конфигом.

**Примеры:**
```
PORT → server.port
BLOCKCHAIN_RPC_URL → blockchain.rpcUrl
DATABASE_HOST → database.host
```

### 7. **.env.example** - Шаблон переменных
Полный список всех переменных окружения с описаниями.

**Секции:**
- Server configuration
- Blockchain configuration
- Contract addresses
- Database configuration
- Redis configuration
- Keeper bot configuration
- API configuration
- Logging & monitoring
- Security
- External services

### 8. **config.schema.ts** - TypeScript типы
TypeScript интерфейсы для type-safe конфигурации.

**Функции:**
- `validateConfig()` - валидация при старте
- `getTypedConfig()` - получение типизированного конфига

### 9. **README.md** - Документация
Полная документация по использованию конфигов.

## 🚀 Быстрый старт

### 1. Локальная разработка

```bash
# 1. Скопировать .env
cp .env.example .env

# 2. Запустить Hardhat node
npx hardhat node

# 3. Задеплоить контракты
npx hardhat run scripts/deploy.js --network localhost

# 4. Обновить адреса контрактов в .env
nano .env

# 5. Запустить backend
cd backend
NODE_ENV=local npm run start:dev
```

### 2. Development сервер

```bash
# 1. Настроить .env для Sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CHAIN_ID=11155111

# 2. Задеплоить на Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# 3. Запустить backend
NODE_ENV=dev npm run start
```

### 3. Production

```bash
# 1. Использовать переменные окружения (не .env файл!)
export BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
export DATABASE_PASSWORD=strong_password
export REDIS_PASSWORD=strong_password

# 2. Запустить
NODE_ENV=prod npm run start:prod
```

## 📊 Сравнение окружений

| Параметр | Local | Dev | Prod |
|----------|-------|-----|------|
| **Network** | Hardhat | Sepolia | Mainnet |
| **ChainId** | 1337 | 11155111 | 1 |
| **Confirmations** | 1 | 3 | 12 |
| **DB Sync** | ✅ | ❌ | ❌ |
| **Swagger** | ✅ | ✅ | ❌ |
| **Log Level** | debug | info | warn |
| **Keeper Interval** | 1 min | 30 min | 1 hour |
| **Liquidation Check** | 10 sec | 30 sec | 1 min |

## 🔧 Настройка интервалов

### Keeper Bot

```json
{
  "keeper": {
    "intervals": {
      "rebalance": 3600000,      // Как часто проверять ребалансировку
      "liquidation": 60000,       // Как часто проверять ликвидации
      "harvest": 86400000,        // Как часто собирать yield
      "indexer": 15000            // Как часто индексировать события
    }
  }
}
```

**Рекомендации:**
- **Local**: быстрые интервалы для тестирования
- **Dev**: средние интервалы
- **Prod**: оптимальные интервалы (баланс между актуальностью и газом)

### Indexer

```json
{
  "indexer": {
    "batchSize": 1000,          // Сколько блоков обрабатывать за раз
    "confirmations": 12         // Сколько подтверждений ждать
  }
}
```

## 🔐 Безопасность

### ⚠️ НИКОГДА не коммитьте:
- `.env` файлы
- Private keys
- Пароли
- API ключи

### ✅ В production используйте:
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets
- Environment variables

### 🛡️ Включите в production:
```json
{
  "security": {
    "rateLimit": { "enabled": true },
    "helmet": { "enabled": true }
  },
  "database": {
    "ssl": true
  }
}
```

## 📝 Примеры использования

### В NestJS сервисе

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainService {
  constructor(private config: ConfigService) {}

  async connect() {
    const rpcUrl = this.config.get<string>('blockchain.rpcUrl');
    const chainId = this.config.get<number>('blockchain.chainId');
    
    // Подключение к блокчейну
  }
}
```

### Валидация при старте

```typescript
import { validateConfig } from './config/config.schema';
import * as config from 'config';

// В main.ts
validateConfig(config);
```

## 🐛 Troubleshooting

### Проблема: Конфиг не загружается
```bash
# Проверьте NODE_ENV
echo $NODE_ENV

# Проверьте синтаксис JSON
cat config/local.json | jq .
```

### Проблема: Переменные окружения не работают
```bash
# Проверьте .env
cat .env

# Проверьте маппинг
cat config/custom-environment-variables.json
```

### Проблема: Контракты не найдены
```bash
# Убедитесь что адреса заполнены
grep "ADDRESS" .env

# Проверьте что контракты задеплоены
npx hardhat run scripts/verify-deployment.js
```

## 📚 Дополнительные ресурсы

- [node-config](https://github.com/node-config/node-config)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [12-Factor App](https://12factor.net/)
- [Environment Variables Best Practices](https://12factor.net/config)
