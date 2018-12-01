# Check'n'Check

## Документация
https://wi.sbis.ru/docs/js/?v=3.18.700

## Иконки
https://wi.sbis.ru/docs/js/icons/?v=3.18.700

## Yandex Money
В папке лежит шаблон создания кнопки (еще не доделаный)

## Установка
1. Настроить Fiddler
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