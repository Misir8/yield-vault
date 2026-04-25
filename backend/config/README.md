# Backend Configuration

Конфигурация backend использует библиотеку [config](https://www.npmjs.com/package/config) для управления настройками в разных окружениях.

## Структура файлов

```
config/
├── default.json                          # Базовые настройки (используются всегда)
├── local.json                            # Локальная разработка
├── dev.json                              # Development окружение
├── prod.json                             # Production окружение
├── test.json                             # Тестовое окружение
├── custom-environment-variables.json     # Маппинг переменных окружения
└── README.md                             # Эта документация
```

## Приоритет загрузки

Конфиги загружаются в следующем порядке (последующие перезаписывают предыдущие):

1. `default.json` - базовые настройки
2. `{NODE_ENV}.json` - настройки для текущего окружения
3. `custom-environment-variables.json` - переменные окружения
4. Переменные окружения напрямую

## Окружения

### Local (NODE_ENV=local)
Для локальной разработки:
```bash
NODE_ENV=local npm run start:dev
```

**Особенности:**
- Hardhat Network (localhost:8545)
- Локальная PostgreSQL
- Локальный Redis
- Быстрые интервалы для keeper/indexer
- Swagger включен
- Debug логирование

### Development (NODE_ENV=dev)
Для dev сервера:
```bash
NODE_ENV=dev npm run start
```

**Особенности:**
- Sepolia testnet
- Dev база данных
- Dev Redis
- Средние интервалы
- Swagger включен
- Info логирование

### Production (NODE_ENV=prod)
Для production:
```bash
NODE_ENV=prod npm run start:prod
```

**Особенности:**
- Ethereum Mainnet
- Production база данных
- Production Redis
- Оптимальные интервалы
- Swagger выключен
- Warn логирование
- Повышенная безопасность

### Test (NODE_ENV=test)
Для тестов:
```bash
NODE_ENV=test npm run test
```

**Особенности:**
- Тестовая база (очищается)
- Keeper/Indexer выключены
- Минимальное логирование

## Основные секции конфига

### Server
```json
{
  "server": {
    "port": 3001,
    "apiPrefix": "api/v1",
    "corsEnabled": true,
    "corsOrigins": ["http://localhost:3000"]
  }
}
```

### Blockchain
```json
{
  "blockchain": {
    "rpcUrl": "http://localhost:8545",
    "chainId": 1337,
    "confirmations": 1,
    "contracts": {
      "vault": "0x...",
      "lendingPool": "0x...",
      ...
    }
  }
}
```

### Database
```json
{
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "defi",
    "password": "defi_password",
    "database": "defi_db"
  }
}
```

### Redis
```json
{
  "redis": {
    "host": "localhost",
    "port": 6379,
    "keyPrefix": "defi:",
    "ttl": 3600
  }
}
```

### Keeper
```json
{
  "keeper": {
    "enabled": true,
    "intervals": {
      "rebalance": 3600000,      // 1 час
      "liquidation": 60000,       // 1 минута
      "harvest": 86400000,        // 24 часа
      "indexer": 15000            // 15 секунд
    },
    "thresholds": {
      "minHealthFactor": 1.0,
      "rebalanceDeviation": 0.05,
      "minProfitForRebalance": 100
    }
  }
}
```

### Indexer
```json
{
  "indexer": {
    "enabled": true,
    "startBlock": 0,
    "batchSize": 1000,
    "confirmations": 12,
    "events": [
      "Deposited",
      "Withdrawn",
      "Borrowed",
      "Repaid",
      "Liquidated"
    ]
  }
}
```

## Переменные окружения

Создайте `.env` файл в корне backend:

```bash
# Скопируйте из примера
cp .env.example .env

# Заполните значения
nano .env
```

### Обязательные переменные

```bash
# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8545
CHAIN_ID=1337
PRIVATE_KEY=0x...

# Contracts (после деплоя)
VAULT_ADDRESS=0x...
LENDING_POOL_ADDRESS=0x...
STRATEGY_MANAGER_ADDRESS=0x...
VAULT_CONTROLLER_ADDRESS=0x...
ORACLE_MANAGER_ADDRESS=0x...
COLLATERAL_REGISTRY_ADDRESS=0x...
STABLE_TOKEN_ADDRESS=0x...

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=defi
DATABASE_PASSWORD=defi_password
DATABASE_NAME=defi_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Использование в коде

### NestJS ConfigService

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  getBlockchainConfig() {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl');
    const chainId = this.configService.get<number>('blockchain.chainId');
    return { rpcUrl, chainId };
  }
}
```

### Прямой доступ к config

```typescript
import * as config from 'config';

const port = config.get<number>('server.port');
const dbConfig = config.get('database');
```

## Безопасность

⚠️ **ВАЖНО:**

1. **Никогда не коммитьте:**
   - `.env` файлы
   - `local.json` с реальными данными
   - Private keys
   - Пароли

2. **В production:**
   - Используйте переменные окружения
   - Храните секреты в AWS Secrets Manager / HashiCorp Vault
   - Включите SSL для БД
   - Используйте сильные пароли

3. **Для CI/CD:**
   - Используйте GitHub Secrets
   - Не логируйте конфиги
   - Ротируйте ключи регулярно

## Проверка конфига

```bash
# Показать текущий конфиг (без секретов)
npm run config:show

# Валидировать конфиг
npm run config:validate
```

## Troubleshooting

### Конфиг не загружается
```bash
# Проверьте NODE_ENV
echo $NODE_ENV

# Проверьте синтаксис JSON
cat config/local.json | jq .
```

### Переменные окружения не работают
```bash
# Проверьте .env файл
cat .env

# Проверьте маппинг
cat config/custom-environment-variables.json
```

### Конфликт настроек
```bash
# Проверьте порядок загрузки
NODE_ENV=local node -e "console.log(require('config'))"
```

## Примеры

### Добавить новую настройку

1. Добавьте в `default.json`:
```json
{
  "myFeature": {
    "enabled": true,
    "timeout": 5000
  }
}
```

2. Переопределите для prod в `prod.json`:
```json
{
  "myFeature": {
    "timeout": 10000
  }
}
```

3. Добавьте переменную окружения в `custom-environment-variables.json`:
```json
{
  "myFeature": {
    "enabled": "MY_FEATURE_ENABLED"
  }
}
```

4. Используйте в коде:
```typescript
const timeout = this.configService.get<number>('myFeature.timeout');
```

## Дополнительные ресурсы

- [node-config документация](https://github.com/node-config/node-config/wiki)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [12-Factor App Config](https://12factor.net/config)
