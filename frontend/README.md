# DeFi Deposit Frontend

React приложение для взаимодействия с DeFi платформой депозитов.

## Функции

- Подключение Web3 кошелька (MetaMask)
- Просмотр баланса и начисленных процентов
- Создание депозитов
- Вывод средств
- Получение процентов

## Технологии

- React 18
- ethers.js для взаимодействия с блокчейном
- Wagmi для Web3 интеграции
- Axios для API запросов

## Разработка

```bash
# Локально (требует Node.js 18+)
cd frontend
npm install
npm start

# В Docker
make logs-frontend
```

## Настройка MetaMask

1. Добавьте локальную сеть Hardhat:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Импортируйте тестовый аккаунт из Hardhat
