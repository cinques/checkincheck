# Check'n'Check

## Документация
https://wi.sbis.ru/docs/js/?v=3.18.700

## Иконки
https://wi.sbis.ru/docs/js/icons/?v=3.18.700

## Yandex Money
В папке лежит шаблон создания кнопки (еще не доделаный)

## Установка
1. Настроить Fiddler
	1.1. fiddler_config_REQUIRED_CHANGE.farx в нем поменять пути до файлов
2. Вызвать что-то вроде:
```javascript
    require([
       'SBIS3.CONTROLS/Action/OpenDialog',
       'Events/PaymentQuery/PaymentQuery'
    ], function(OpenDialog) {
       var options = {};
       new OpenDialog({
          template: 'Events/PaymentQuery/PaymentQuery'
       }).execute({
          dialogOptions:     {
             width: 200,
             resizeable: false,
             autoWidth: false,
             title: "Запрос оплаты",
          },
          mode: 'dialog',
          componentOptions: options
       })
    });
```

3. Установить PostgreSQL
    Вызвать скрипт создания таблиц:
```sql
CREATE TABLE public.payments
(
      event_id uuid NOT NULL,
      debitor uuid NOT NULL,
      creditor uuid NOT NULL,
      sum integer,
      req text,
      state integer,
      CONSTRAINT payments_pkey PRIMARY KEY (event_id, debitor, creditor)
)
```
4. Установить Node.js
	4.1.

