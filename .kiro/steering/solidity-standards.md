---
inclusion: fileMatch
fileMatchPattern: "**/*.sol"
---

# Стандарты разработки Solidity

## Безопасность

- Использовать OpenZeppelin контракты для стандартных функций
- Применять модификаторы `nonReentrant` для защиты от реентрантности
- Использовать `SafeMath` или встроенные проверки Solidity 0.8+
- Проверять все входные данные
- Использовать паттерн Checks-Effects-Interactions

## Стиль кода

- Версия Solidity: ^0.8.20
- Использовать NatSpec комментарии для всех публичных функций
- Именование: CamelCase для контрактов, camelCase для функций
- События для всех важных изменений состояния
- Модификаторы для повторяющихся проверок

## Структура контракта

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Импорты
import "@openzeppelin/contracts/...";

// Контракт
contract Name {
    // State variables
    // Events
    // Modifiers
    // Constructor
    // External functions
    // Public functions
    // Internal functions
    // Private functions
}
```

## Тестирование

- Покрытие тестами минимум 90%
- Тестировать граничные случаи
- Тестировать отказы и ревертирования
- Использовать Hardhat для тестирования
