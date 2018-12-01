define('Events/CheckInCheck/RequisitesPicker/RequisitesPicker', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',

    'SBIS3.CONTROLS/Utils/InformationPopupManager',
    'Core/UserInfo',

    'css!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',
],

//Компонент для "Запроса денег"
function(CompoundControl, dotTplFn, InformationPopupManager, UserInfo) {

    var RequisitesPicker = CompoundControl.extend({
        _dotTplFn: dotTplFn,
        init: function() {
            RequisitesPicker.superclass.init.call(this);
            
            this.subscribe('onReady', this.onReadyHandler1)
        },



        onReadyHandler1: function(){
            //Добавляем кнопку из шаблона (requisitesSubmitButton)
            var requisitesSubmitButton = this.getChildControlByName('requisitesSubmitButton')
            //alert(requisitesSubmitButton.name)
            requisitesSubmitButton.subscribe('onActivated', function (event){
                 message = 'Проверьте свои реквизиты: '
                 this.requisites = this.getParent().getChildControlByName('myRequisitesTextBox').getText()
                 message = message + this.getParent().getChildControlByName('myRequisitesTextBox').getText()
                 //alert(message)
                 InformationPopupManager.showConfirmDialog({
                     message: message,
                     details: 'Если данные не верны, нажмите «Нет».',
                     opener: this,
                  },

                  this.getParent().AcceptRequisites
                  );
                
                
            })

            
        },

        //Вызывается если пользователь проверил и принял указаные реквизиты
        AcceptRequisites: function (){
            //Получить event id
            var eventId = window.__eventId
            alert('EventId: ', eventId)
            
            //Запрос на получение creditor, debitor, sum

            fetch('/paymentService/get_debitor_list', {
                method: 'post',
                headers: {
                   'Accept': 'application/json',
                   'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event_id: toString(eventId),
                })
             }).then(function(result){
                alert('Полученная информация: ' + toString(result))
             });




            var uISF = UserInfo.get('ИдентификаторСервисаПрофилей')
            
            //alert(uISF)
            //Отсылаем запрос на добавление платежей
          
            

            paymentsData = JSON.stringify({
                event_id: eventId,
                creditor: uISF,
                status: 0,
                req: toString(this.requisites),
                debitor: [
                    {
                        debitor: "8a6603e0-f8cc-4528-8a58-6041cf410213",
                        sum: 500
                    }
                ]

                
            })
            fetch('/paymentService/add_payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: paymentsData
            });
        }

        






    })


    return RequisitesPicker
}
)