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
);

CREATE TABLE checks (id uuid, eventId uuid, seller text, payerId uuid);
CREATE TABLE debitor (personId uuid, productId uuid);

create table product
( 	id uuid,
	name text,
	price real,
	checkId uuid
);

CREATE TABLE fixed (event_id uuid, state boolean)

```
4. Установить Node.js
5. Скачать сервер с репозитория 
`git clone https://github.com/AndreyLebedev95/initialstate.git`
6. Перейти в папку сервера
7. Вызвать `npm install`
8. В файле app.js установить свой пароль и логин Postgres	

